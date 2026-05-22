package plugin

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"os"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/lib/pq"
)

type App struct {
	backend.CallResourceHandler
	db *sql.DB
}

func NewApp(ctx context.Context, appSettings backend.AppInstanceSettings) (instancemgmt.Instance, error) {
	// Use environment variable, fallback to your production IP
	connStr := os.Getenv("MY_APP_DB_URL")
	if connStr == "" {
		// Production Database Connection
		connStr = "postgres://admin:ERSDigital2009@192.168.1.11:5888/pdr_pv_monitoring_db?sslmode=disable"
	}

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, err
	}

	return &App{db: db}, nil
}

func (a *App) Dispose() {
	if a.db != nil {
		a.db.Close()
	}
}

// CallResource acts as your API Router
func (a *App) CallResource(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	
	// 1. GET /sites
	if req.Path == "sites" && req.Method == http.MethodGet {
		rows, err := a.db.Query("SELECT station_code, plantname, status FROM station_dim")
		if err != nil { return sendError(sender, err) }
		defer rows.Close()

		var sites []map[string]interface{}
		for rows.Next() {
			var code, name, status sql.NullString
			rows.Scan(&code, &name, &status)
			sites = append(sites, map[string]interface{}{
				"code": code.String, "name": name.String, "status": status.String,
			})
		}
		return sendJSON(sender, sites)
	}

	// 2. GET /inverters
	if req.Path == "inverters" && req.Method == http.MethodGet {
		rows, err := a.db.Query("SELECT inverter_sn, station_code FROM device_list")
		if err != nil { return sendError(sender, err) }
		defer rows.Close()

		var inverters []map[string]interface{}
		for rows.Next() {
			var sn, site sql.NullString
			rows.Scan(&sn, &site)
			inverters = append(inverters, map[string]interface{}{
				"sn": sn.String, "site": site.String, "strings": 40, // Defaulting to 40 strings
			})
		}
		return sendJSON(sender, inverters)
	}

	// 3. GET /exclusions
	if req.Path == "exclusions" && req.Method == http.MethodGet {
		rows, err := a.db.Query("SELECT inverter_sn, excluded_strings FROM inverter_string_exclusions")
		if err != nil { return sendError(sender, err) }
		defer rows.Close()

		exclusions := make(map[string][]int64)
		for rows.Next() {
			var sn string
			var exc pq.Int64Array
			rows.Scan(&sn, &exc)
			exclusions[sn] = exc
		}
		return sendJSON(sender, exclusions)
	}

	// 4. POST /exclusions (Save Exclusions)
	if req.Path == "exclusions" && req.Method == http.MethodPost {
		var payload struct {
			SiteCode string  `json:"site_code"`
			InvSN    string  `json:"inverter_sn"`
			Excluded []int64 `json:"excluded_strings"`
			Remarks  string  `json:"remarks"`
		}
		json.Unmarshal(req.Body, &payload)

		// UPSERT Logic: Insert new, or update if the Inverter SN already exists
		query := `
			INSERT INTO inverter_string_exclusions (station_code, inverter_sn, excluded_strings, remarks, updated_at) 
			VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
			ON CONFLICT (inverter_sn) 
			DO UPDATE SET excluded_strings = EXCLUDED.excluded_strings, remarks = EXCLUDED.remarks, updated_at = CURRENT_TIMESTAMP;
		`
		_, err := a.db.Exec(query, payload.SiteCode, payload.InvSN, pq.Array(payload.Excluded), payload.Remarks)
		if err != nil { return sendError(sender, err) }

		return sendJSON(sender, map[string]string{"status": "ok"})
	}

	return sender.Send(&backend.CallResourceResponse{Status: http.StatusNotFound})
}

// Helper functions to clean up code
func sendJSON(sender backend.CallResourceResponseSender, data interface{}) error {
	bytes, _ := json.Marshal(data)
	return sender.Send(&backend.CallResourceResponse{Status: http.StatusOK, Body: bytes})
}

func sendError(sender backend.CallResourceResponseSender, err error) error {
	bytes, _ := json.Marshal(map[string]string{"error": err.Error()})
	return sender.Send(&backend.CallResourceResponse{Status: http.StatusInternalServerError, Body: bytes})
}

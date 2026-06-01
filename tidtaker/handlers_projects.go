package main

import (
	"encoding/json"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

// Projects page
func handleProjectsPage(e *core.RequestEvent) error {
	auth, err := requireAuth(e)
	if err != nil {
		return err
	}

	projects, err := e.App.FindRecordsByFilter(
		"projects",
		"userId = {:userId}",
		"tag",
		500,
		0,
		dbx.Params{"userId": auth.Id},
	)
	if err != nil {
		projects = nil
	}

	return renderPage(e, "projects", map[string]any{
		"Projects": projects,
		"Error":    "",
	})
}

// Create project mapping
func handleProjectCreate(e *core.RequestEvent) error {
	auth, err := requireAuth(e)
	if err != nil {
		return err
	}

	tag := strings.TrimSpace(e.Request.FormValue("tag"))
	prosjekt := strings.TrimSpace(e.Request.FormValue("prosjekt"))
	aktivitet := strings.TrimSpace(e.Request.FormValue("aktivitet"))

	if tag == "" {
		return renderProjectsPage(e, auth, "Tag kan ikke være tom")
	}

	collection, err := e.App.FindCollectionByNameOrId("projects")
	if err != nil {
		return e.InternalServerError("Collection not found", err)
	}

	record := core.NewRecord(collection)
	record.Set("userId", auth.Id)
	record.Set("tag", tag)
	record.Set("prosjekt", prosjekt)
	record.Set("aktivitet", aktivitet)

	if err := e.App.Save(record); err != nil {
		return e.InternalServerError("Could not save project", err)
	}

	return e.Redirect(http.StatusSeeOther, "/projects")
}

// Delete project mapping
func handleProjectDelete(e *core.RequestEvent) error {
	auth, err := requireAuth(e)
	if err != nil {
		return err
	}

	id := e.Request.PathValue("id")
	record, err := e.App.FindRecordById("projects", id)
	if err != nil || record.GetString("userId") != auth.Id {
		return e.NotFoundError("Project not found", nil)
	}

	if err := e.App.Delete(record); err != nil {
		return e.InternalServerError("Could not delete project", err)
	}

	return e.Redirect(http.StatusSeeOther, "/projects")
}

// Update project mapping
func handleProjectUpdate(e *core.RequestEvent) error {
	auth, err := requireAuth(e)
	if err != nil {
		return err
	}

	id := e.Request.PathValue("id")
	record, err := e.App.FindRecordById("projects", id)
	if err != nil || record.GetString("userId") != auth.Id {
		return e.NotFoundError("Project not found", nil)
	}

	prosjekt := strings.TrimSpace(e.Request.FormValue("prosjekt"))
	aktivitet := strings.TrimSpace(e.Request.FormValue("aktivitet"))

	record.Set("prosjekt", prosjekt)
	record.Set("aktivitet", aktivitet)

	if err := e.App.Save(record); err != nil {
		return e.InternalServerError("Could not update project", err)
	}

	return e.Redirect(http.StatusSeeOther, "/projects")
}

func renderProjectsPage(e *core.RequestEvent, auth *core.Record, errMsg string) error {
	projects, _ := e.App.FindRecordsByFilter(
		"projects",
		"userId = {:userId}",
		"tag",
		500,
		0,
		dbx.Params{"userId": auth.Id},
	)

	return renderPage(e, "projects", map[string]any{
		"Projects": projects,
		"Error":    errMsg,
	})
}

// Export timings as JSON for Xledger
func handleExport(e *core.RequestEvent) error {
	auth := getAuthRecord(e)
	if auth == nil {
		e.Response.Header().Set("Content-Type", "application/json")
		e.Response.WriteHeader(http.StatusUnauthorized)
		_, _ = e.Response.Write([]byte(`{"error":"unauthenticated"}`))
		return nil
	}

	monthStr := strings.TrimSpace(e.Request.URL.Query().Get("month"))
	if monthStr == "" {
		return e.BadRequestError("month parameter required (format: 2026-05)", nil)
	}

	// Parse month
	monthStart, err := time.Parse("2006-01", monthStr)
	if err != nil {
		return e.BadRequestError("invalid month format, use YYYY-MM", err)
	}
	// End of month = start of next month
	monthEnd := monthStart.AddDate(0, 1, 0)

	// Fetch all non-active timings for the month
	timings, err := e.App.FindRecordsByFilter(
		"timings",
		"userId = {:userId} && isActive = false && startTime >= {:from} && startTime < {:to}",
		"startTime",
		10000,
		0,
		dbx.Params{
			"userId": auth.Id,
			"from":   monthStart.UTC().Format("2006-01-02 15:04:05.000Z"),
			"to":     monthEnd.UTC().Format("2006-01-02 15:04:05.000Z"),
		},
	)
	if err != nil {
		timings = nil
	}

	// Fetch all project mappings for this user
	projectRecords, _ := e.App.FindRecordsByFilter(
		"projects",
		"userId = {:userId}",
		"tag",
		500,
		0,
		dbx.Params{"userId": auth.Id},
	)

	// Build tag → (prosjekt, aktivitet) map
	type ProjectMapping struct {
		Prosjekt  string
		Aktivitet string
	}
	projectMap := make(map[string]ProjectMapping)
	for _, p := range projectRecords {
		projectMap[p.GetString("tag")] = ProjectMapping{
			Prosjekt:  p.GetString("prosjekt"),
			Aktivitet: p.GetString("aktivitet"),
		}
	}

	// Group timings by (date, tag, description)
	type GroupKey struct {
		Date        string
		Tag         string
		Description string
	}
	type Group struct {
		TotalMinutes float64
		Prosjekt     string
		Aktivitet    string
	}
	groups := make(map[GroupKey]*Group)
	// Keep insertion order for deterministic output
	var keyOrder []GroupKey

	for _, t := range timings {
		startDT := t.GetDateTime("startTime")
		stopDT := t.GetDateTime("stopTime")
		if startDT.IsZero() || stopDT.IsZero() {
			continue
		}

		// Use local date of start time (as string in Oslo time — use UTC for simplicity)
		date := startDT.Time().UTC().Format("2006-01-02")
		description := t.GetString("description")
		tags := t.GetStringSlice("tags")

		// Duration in minutes
		duration := stopDT.Time().Sub(startDT.Time()).Minutes()

		if len(tags) == 0 {
			// No tag — use empty tag
			key := GroupKey{Date: date, Tag: "", Description: description}
			if _, ok := groups[key]; !ok {
				groups[key] = &Group{}
				keyOrder = append(keyOrder, key)
			}
			groups[key].TotalMinutes += duration
		} else {
			// One row per tag
			for _, tag := range tags {
				key := GroupKey{Date: date, Tag: tag, Description: description}
				if _, ok := groups[key]; !ok {
					mapping := projectMap[tag]
					groups[key] = &Group{
						Prosjekt:  mapping.Prosjekt,
						Aktivitet: mapping.Aktivitet,
					}
					keyOrder = append(keyOrder, key)
				}
				groups[key].TotalMinutes += duration
			}
		}
	}

	// Build export rows
	type ExportRow struct {
		Date      string  `json:"date"`
		Prosjekt  string  `json:"prosjekt"`
		Aktivitet string  `json:"aktivitet"`
		Tekst     string  `json:"tekst"`
		Timer     float64 `json:"timer"`
	}

	rows := make([]ExportRow, 0, len(keyOrder))
	for _, key := range keyOrder {
		g := groups[key]
		hours := roundToHalfHour(g.TotalMinutes / 60.0)
		rows = append(rows, ExportRow{
			Date:      key.Date,
			Prosjekt:  g.Prosjekt,
			Aktivitet: g.Aktivitet,
			Tekst:     key.Description,
			Timer:     hours,
		})
	}

	data, err := json.Marshal(rows)
	if err != nil {
		return e.InternalServerError("Could not serialize export", err)
	}

	e.Response.Header().Set("Content-Type", "application/json")
	e.Response.WriteHeader(http.StatusOK)
	_, werr := e.Response.Write(data)
	return werr
}

// roundToHalfHour rounds hours to the nearest 0.5h
func roundToHalfHour(hours float64) float64 {
	return math.Round(hours*2) / 2
}

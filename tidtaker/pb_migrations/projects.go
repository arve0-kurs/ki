package pb_migrations

import (
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/migrations"
)

func init() {
	migrations.Register(func(app core.App) error {
		collection := core.NewBaseCollection("projects")

		collection.Fields.Add(
			&core.TextField{
				Name:     "userId",
				Required: true,
			},
			&core.TextField{
				Name:     "tag",
				Required: true,
			},
			&core.TextField{
				Name: "prosjekt",
			},
			&core.TextField{
				Name: "aktivitet",
			},
		)

		// Disable default CRUD API rules (we use custom endpoints)
		collection.ListRule = nil
		collection.ViewRule = nil
		collection.CreateRule = nil
		collection.UpdateRule = nil
		collection.DeleteRule = nil

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("projects")
		if err != nil {
			return err
		}
		return app.Delete(collection)
	})
}

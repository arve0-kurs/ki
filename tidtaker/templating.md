# Go html/template – rask referanse

Dokumentasjon: https://pkg.go.dev/html/template@go1.26.3

## Definere og inkludere templates

```html
{{define "navn"}} ... {{end}}

{{template "navn" .}}          <!-- send hele konteksten videre -->
{{template "navn" .Timing}}    <!-- send ett felt videre -->
```

## Skrive ut verdier

```html
{{.Felt}}                      <!-- felt på gjeldende kontekst -->
{{.Nested.Felt}}               <!-- nestet felt -->
{{.Metode "arg"}}              <!-- metodekall med argument -->
{{funksjon .Felt}}             <!-- egendefinert funksjon -->
```

## Betingelser

```html
{{if .Felt}} ... {{end}}
{{if .Felt}} ... {{else}} ... {{end}}
{{if eq .A .B}} ... {{end}}    <!-- eq, ne, lt, le, gt, ge -->
{{if and .A .B}} ... {{end}}
{{if not .Felt}} ... {{end}}
```

## Løkker

```html
{{range .Liste}}
  {{.}}                        <!-- gjeldende element -->
{{end}}

{{range .Liste}}
  {{$.ParentFelt}}             <!-- $ = rotkontekst utenfor range -->
{{end}}

{{range .Liste}} ... {{else}} tom liste {{end}}
```

## Sette variabel

```html
{{$x := .Felt}}
{{$x}}
```

## Pipe

```html
{{.Felt | funksjon}}
{{.Felt | funksjon | annenFunksjon}}
```

## Kommentar

```html
{{/* Dette er en kommentar */}}
```

## Innebygde funksjoner

| Funksjon | Eksempel |
|----------|---------|
| `eq` | `{{if eq .A "x"}}` |
| `len` | `{{if gt (len .Liste) 0}}` |
| `index` | `{{index .Liste 0}}` |
| `printf` | `{{printf "%d items" (len .Liste)}}` |
| `call` | `{{call .Fn arg}}` |

## Metoder med argumenter (PocketBase Record)

I dette prosjektet er template-konteksten ofte en PocketBase `*core.Record` – en dynamisk
nøkkelverdi-bag uten typede struct-felt. Verdier hentes med metoder der feltnavnet er en streng:

```go
// Go-kode setter verdien:
record.Set("isActive", true)

// Sendes til template:
renderPartial(e, "timing_item", map[string]any{"Timing": record})
```

```html
<!-- Template leser verdien: -->
{{if .Timing.GetBool "isActive"}}● aktiv{{end}}
{{.Timing.GetString "description"}}
{{.Timing.GetDateTime "startTime"}}
{{range .Timing.GetStringSlice "tags"}}{{.}}{{end}}
```

Relevante metoder på `core.Record`:

| Metode | Returtype |
|--------|-----------|
| `GetBool "felt"` | `bool` |
| `GetString "felt"` | `string` |
| `GetDateTime "felt"` | `types.DateTime` |
| `GetStringSlice "felt"` | `[]string` |

## Whitespace-kontroll

```html
{{- .Felt -}}   <!-- fjern whitespace før/etter med bindestrek -->
```

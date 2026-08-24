# Paisa API & Swagger Documentation

Paisa features interactive API documentation powered by the Go Swaggo ecosystem and Swagger UI.

## Endpoints

When running Paisa locally (`paisa serve` or `make dev`), the API documentation is available at:

- **Interactive Swagger UI**: [http://localhost:7500/swagger/index.html](http://localhost:7500/swagger/index.html)
- **Raw Swagger 2.0 JSON Specification**: [http://localhost:7500/swagger/doc.json](http://localhost:7500/swagger/doc.json)

---

## Authentication in Swagger UI

Paisa's API uses the `X-Auth` HTTP header for token-based authentication when user accounts are configured in `paisa.yaml`:

- Header Name: `X-Auth`
- Format: `username:password`

To test authenticated endpoints in Swagger UI:
1. Click the **Authorize** button at the top right of the Swagger UI interface.
2. Enter your credentials in `username:password` format.
3. Use the **Try it out** button on any `/api/*` endpoint.

---

## Generating Swagger Specification

The specification is derived from Go handler annotations in `backend/pkg/server/handlers.go` and DTO definitions in `backend/pkg/api/dto/`.

### Commands

From repository root:
```bash
make swagger
```

Or from `backend/`:
```bash
go generate ./...
```

Generated artifacts are committed in `backend/docs/`:
- `docs.go`
- `swagger.json`
- `swagger.yaml`

> **Note**: Do not edit `backend/docs/*` manually. All modifications should be made via Go doc annotations and DTO structs.

---

## Developer Workflow: Adding a New Endpoint

When adding or modifying an HTTP endpoint:

1. **Define DTOs**: Add explicit Request and Response DTOs in `backend/pkg/api/dto/`.
2. **Implement Logic**: Implement domain calculations in `pkg/service/` or `pkg/query/` (never inside HTTP handlers).
3. **Write Handler**: Write the named handler function in `backend/pkg/server/handlers.go` with complete Swagger annotations:
   ```go
   // GetExampleHandler godoc
   //
   // @Summary Short summary
   // @Description Detailed description
   // @Tags ExampleTag
   // @Produce json
   // @Success 200 {object} dto.ExampleResponse
   // @Failure 400 {object} dto.ErrorResponse
   // @Security PaisaAuth
   // @Router /example [get]
   func GetExampleHandler(db *gorm.DB) gin.HandlerFunc {
       return func(c *gin.Context) {
           c.JSON(200, dto.ExampleResponse{...})
       }
   }
   ```
4. **Register Route**: Wire the handler in `backend/pkg/server/server.go`.
5. **Regenerate Swagger**: Run `make swagger`.
6. **Verify Coverage**: Run `go test -v ./pkg/server -run "TestSwagger|TestArchitecture"`.

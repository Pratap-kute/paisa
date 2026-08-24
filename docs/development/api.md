# Paisa API & Generated Client Documentation

Paisa features interactive API documentation powered by the Go Swaggo ecosystem, Swagger UI, and end-to-end typed TypeScript code generation via `swagger-typescript-api`.

## Endpoints

When running Paisa locally (`paisa serve` or `make dev`), the API documentation is available at:

- **Interactive Swagger UI**: [http://localhost:7500/swagger/index.html](http://localhost:7500/swagger/index.html)
- **Raw Swagger 2.0 JSON Specification**: [http://localhost:7500/swagger/doc.json](http://localhost:7500/swagger/doc.json)

---

## Authentication in Swagger UI and Frontend

Paisa's API uses the `X-Auth` HTTP header for token-based authentication when user accounts are configured in `paisa.yaml`:

- Header Name: `X-Auth`
- Format: `username:password`

The frontend automatically injects this header via `frontend/src/lib/api/client.ts` using stored credentials.

To test authenticated endpoints in Swagger UI:
1. Click the **Authorize** button at the top right of the Swagger UI interface.
2. Enter your credentials in `username:password` format.
3. Use the **Try it out** button on any `/api/*` endpoint.

---

## Code Generation Pipeline

The specification is derived from Go handler annotations in `backend/pkg/server/handlers.go` and DTO definitions in `backend/pkg/api/dto/`. The frontend TypeScript types and native Fetch API client are generated directly from `backend/docs/swagger.json`.

```
Go DTOs & Handlers
       │ (swag)
       ▼
backend/docs/swagger.json
       │ (swagger-typescript-api)
       ▼
frontend/src/lib/api/generated/Api.ts
       │
       ▼
frontend/src/lib/api/client.ts
```

### Commands

- **Full End-to-End Generation (Backend + Frontend)**:
  ```bash
  make api
  ```
  *(or `make generate`)*

- **Backend Swagger Spec Only**:
  ```bash
  make swagger
  ```

- **Frontend TypeScript Client Only**:
  ```bash
  cd frontend && deno task api:generate
  ```

- **Verify Frontend Generation Drift (CI Check)**:
  ```bash
  cd frontend && deno task api:check
  ```

---

## Generated Artifacts

- **Backend Specification**:
  - `backend/docs/docs.go`
  - `backend/docs/swagger.json`
  - `backend/docs/swagger.yaml`

- **Frontend API Client**:
  - `frontend/src/lib/api/generated/Api.ts` (Auto-generated Fetch client and DTO contracts)
  - `frontend/src/lib/api/client.ts` (Runtime wrapper with `X-Auth` header injection)
  - `frontend/src/lib/api/errors.ts` (Typed API error definitions)
  - `frontend/src/lib/api/index.ts` (Entrypoint barrel export)

> **Important**: Do not edit `backend/docs/*` or `frontend/src/lib/api/generated/*` manually. All modifications should be made via Go doc annotations, DTO structs, and regeneration.

---

## Developer Workflow: Adding or Modifying an Endpoint

When adding or modifying an HTTP endpoint:

1. **Define DTOs**: Add explicit Request and Response DTOs in `backend/pkg/api/dto/`.
2. **Implement Logic**: Implement domain calculations in `pkg/service/` or `pkg/query/` (never inside HTTP handlers).
3. **Write Handler**: Write the named handler function in `backend/pkg/server/handlers.go` with complete Swagger and `@ID` annotations:
   ```go
   // GetExampleHandler godoc
   //
   // @ID getExample
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
5. **Regenerate Full Pipeline**: Run `make api`.
6. **Verify Coverage & Types**:
   - Backend: `cd backend && go test -v ./pkg/server -run "TestSwagger|TestArchitecture"`
   - Frontend: `cd frontend && deno task check && deno task test`

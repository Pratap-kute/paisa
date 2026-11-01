FROM --platform=$BUILDPLATFORM oven/bun:1.4.4 AS web
WORKDIR /usr/src/paisa/frontend
COPY frontend/package.json frontend/bun.lock ./
RUN bun install --frozen-lockfile
COPY frontend ./
RUN bun run build

FROM golang:1.26-alpine AS go
WORKDIR /usr/src/paisa/backend
RUN apk --no-cache add sqlite gcc g++
COPY backend/go.mod backend/go.sum ./
RUN go mod download && go mod verify
COPY backend ./
COPY --from=web /usr/src/paisa/backend/web/static ./web/static
RUN CGO_ENABLED=1 go build -o /usr/src/paisa/paisa .

FROM alpine:latest
RUN apk --no-cache add ca-certificates ledger tzdata
WORKDIR /root/
COPY --from=go /usr/src/paisa/paisa /usr/bin
EXPOSE 7500
CMD ["paisa", "serve"]

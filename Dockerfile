FROM --platform=$BUILDPLATFORM denoland/deno:alpine AS web
WORKDIR /usr/src/paisa/frontend
COPY frontend/deno.json frontend/deno.lock* ./
RUN deno install
COPY frontend ./
RUN deno task build

FROM golang:1.24-alpine3.21 AS go
WORKDIR /usr/src/paisa/backend
RUN apk --no-cache add sqlite gcc g++
COPY backend/go.mod backend/go.sum ./
RUN go mod download && go mod verify
COPY backend ./
COPY --from=web /usr/src/paisa/backend/web/static ./web/static
RUN CGO_ENABLED=1 go build -o /usr/src/paisa/paisa .

FROM alpine:3.21
RUN apk --no-cache add ca-certificates ledger tzdata
WORKDIR /root/
COPY --from=go /usr/src/paisa/paisa /usr/bin
EXPOSE 7500
CMD ["paisa", "serve"]

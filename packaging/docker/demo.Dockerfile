FROM --platform=$BUILDPLATFORM denoland/deno:latest AS web
WORKDIR /usr/src/paisa/frontend
COPY frontend/deno.json frontend/deno.lock* ./
RUN deno install --allow-scripts
COPY frontend ./
RUN deno install --allow-scripts
RUN deno task build

FROM golang:1.26-alpine AS go
WORKDIR /usr/src/paisa/backend
RUN apk --no-cache add sqlite gcc g++
COPY backend/go.mod backend/go.sum ./
RUN go mod download && go mod verify
COPY backend ./
COPY --from=web /usr/src/paisa/backend/web/static ./web/static
RUN CGO_ENABLED=1 go build -o /usr/src/paisa/paisa .

FROM alpine:latest
RUN apk --no-cache add ca-certificates ledger yq
WORKDIR /root/
COPY --from=go /usr/src/paisa/paisa /usr/bin/
RUN paisa init && paisa update && yq -i '.readonly = true' paisa.yaml
ENV PAISA_DISABLE_LOG_FILE=true
EXPOSE 7500
CMD ["paisa", "serve"]

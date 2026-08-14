ARG BASE_IMAGE=pratapkute/paisa:latest
FROM ${BASE_IMAGE}

RUN apk --no-cache add beancount

WORKDIR /root/

CMD ["paisa", "serve"]

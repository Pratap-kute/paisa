---
description: "Protect the Paisa web interface with a username and password."
---

# User authentication

You can add a username and password to protect the Paisa web interface. Open
**Configuration**, expand **User Accounts**, and click
:fontawesome-solid-circle-plus: to add an account. Saving the first account
signs you out so you can log in with the new credentials.

Authentication protects the web interface, not the files on disk. Anyone who
can read your Paisa data directory can still access your journal and database.

## Password storage

Passwords created or changed by current versions of Paisa are stored as
Argon2id hashes, not as plain text. Older configurations that contain a
`sha256:` password still work; after a successful login, Paisa upgrades that
credential to Argon2id automatically.

No one can read the original password from `paisa.yaml`. If you forget it, you
can remove the user account from the [configuration](./config.md) file and set
up a new one.

!!! warning

    If you expose Paisa over a network, use HTTPS and a strong password. Plain
    HTTP can expose your login credentials and financial data to anyone able to
    intercept the connection.

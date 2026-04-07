#!/usr/bin/env python3
"""Add a super admin by email address."""
# /// script
# requires-python = ">=3.10"
# dependencies = ["psycopg2-binary", "python-dotenv"]
# ///

import sys
from pathlib import Path

from dotenv import dotenv_values
import psycopg2

def main():
    email = sys.argv[1] if len(sys.argv) > 1 else input("Email: ").strip()
    if not email:
        print("Error: email is required")
        sys.exit(1)

    env = dotenv_values(Path(__file__).resolve().parent.parent / ".env")
    conn = psycopg2.connect(
        host=env["DB_HOST"],
        port=env.get("DB_PORT", "5432"),
        dbname=env["DB_NAME"],
        user=env["DB_USER"],
        password=env["DB_PASSWORD"],
    )
    cur = conn.cursor()

    cur.execute('SELECT id, name FROM "user" WHERE email = %s', (email,))
    row = cur.fetchone()
    if not row:
        print(f"Error: no user found with email {email}")
        conn.close()
        sys.exit(1)

    user_id, name = row
    cur.execute(
        "INSERT INTO super_admins (user_id) VALUES (%s) ON CONFLICT (user_id) DO NOTHING RETURNING id",
        (user_id,),
    )
    result = cur.fetchone()
    conn.commit()

    if result:
        print(f"Super admin added: {name} ({email})")
    else:
        print(f"Already a super admin: {name} ({email})")

    conn.close()

if __name__ == "__main__":
    main()

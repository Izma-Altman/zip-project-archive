# .Zip Project Archive
.Zip is a centralized, full-stack platform designed to store, manage, retrieve and analyze academic projects. Built for educational Institutions, it prevents the repetition of projects and promotes new and innovative ideas.

* **Similarity Checker:**
  Integrates the `all-MiniLM-L6-v2` text embedding model to mathematically scan abstracts and titles to detect overlapping project ideas.

* **Trend Analytics:**
  Visual dashboards that track the most popular technology stacks used by students.
* **Role-Based Access Control ( RBAC ):**
  Secure Google OAuth 2.0 and JWT authentication for different roles like Student, Faculty, and Admin.
* **High Concurrency File Management:**
  SQLite database configured with Write Ahead Logging ( WAL ) and Shared Memory to handle simultaneous heavy file uploads without locking.
* **Other features include:**
  Filtered Searching and Batch uploading ( Admins can upload Excel files to import faculty and project lists ).

## Tech Stack

* **Frontend:** React.js, Tailwind CSS, Vite
* **Backend:** Python, Flask, Flask-JWT-Extended, Authlib
* **Database:** SQLite with SQLAlchemy ORM

## Prerequisites
* Node.js (v18+)
* Python (v3.10+)
* Google Cloud Console account (for OAuth credentials)

## Installation & Setup
1. create a virtual environment
2. Fill in the details in the `.env` file - in `backend` folder

    ```
    GOOGLE_CLIENT_ID =
    GOOGLE_CLIENT_SECRET =
    ALLOWED_DOMAIN = 
    JWT_SECRET_KEY =
    ```
3. install dependencies `pip install -r requirements.txt` ( in backend folder )
4. `npm install` ( in frontend folder )
5. To run: `python run.py` ( in backend folder ) and `npm run dev` ( in frontend folder )

Make sure to have a database editor ( like DB Browser for SQLite ) to manually set the first Admin.

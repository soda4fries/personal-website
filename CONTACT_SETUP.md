# Anonymous Contact Message System Setup

This system provides both web API and CLI interfaces for managing anonymous contact messages with admin authentication.

## Quick Setup

### Linux/macOS

```bash
# Make setup script executable and run it
chmod +x setup-contact.sh
./setup-contact.sh
```

### Windows

```cmd
# Run the setup batch file
setup-contact.bat
```

## Manual Setup

If you prefer to set up manually:

```bash
# Create virtual environment
python3 -m venv contact-venv

# Activate it
source contact-venv/bin/activate  # Linux/macOS
# OR
contact-venv\Scripts\activate.bat  # Windows

# Install dependencies
pip install -r requirements.txt
```

## Configuration

Set your admin password as an environment variable:

```bash
# Linux/macOS
export CONTACT_ADMIN_PASSWORD=your_secure_password

# Windows
set CONTACT_ADMIN_PASSWORD=your_secure_password
```

## Usage

### Start API Server

```bash
python contact-me.py
# API available at http://localhost:8000
```

### CLI Commands

```bash
# Interactive mode
python contact-me.py --cli

# Quick commands
python contact-me.py --list                    # List all messages
python contact-me.py --reply KEY "Your reply"  # Reply to message
python contact-me.py --stats                   # Show statistics
python contact-me.py --view KEY                # View specific message
python contact-me.py --help                    # Show all options
```

## API Endpoints

### Public Endpoints

- `POST /api/contact/send-message` - Send anonymous message
- `POST /api/contact/check-reply` - Check for replies
- `GET /` - Health check

### Admin Endpoints (require Bearer token)

- `GET /api/contact/admin/messages` - List all messages
- `POST /api/contact/admin/reply/{key}` - Reply to message
- `GET /api/contact/admin/stats` - Get statistics

### Admin API Authentication

Use Bearer token with your admin password:

```bash
curl -H "Authorization: Bearer your_secure_password" \
     http://localhost:8000/api/contact/admin/messages
```

## Database

- **Type**: SQLite
- **File**: `contact_messages.db` (created automatically)
- **Tables**: `messages`, `replies`

## Security Features

- ✅ Environment-based admin password
- ✅ CLI password prompt (hidden input)
- ✅ API Bearer token authentication
- ✅ Proper HTTP status codes
- ✅ Input validation and sanitization

## Troubleshooting

### Python not found

Install Python 3.8 or higher from [python.org](https://python.org)

### Permission denied on Linux/macOS

```bash
chmod +x setup-contact.sh
```

### Admin features disabled

Make sure `CONTACT_ADMIN_PASSWORD` environment variable is set

### Port already in use

Use a different port:

```bash
python contact-me.py --port 8001
```

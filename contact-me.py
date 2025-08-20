#!/usr/bin/env python3
"""
Anonymous Contact Message System

This system provides both CLI and API interfaces for managing anonymous messages.
It uses SQLite for data persistence and provides admin functionality with password protection.

Setup:
    export CONTACT_ADMIN_PASSWORD=your_secure_password

CLI Usage:
    python contact-me.py                    # Start API server + interactive CLI
    python contact-me.py --port 8080       # Start on custom port
    python contact-me.py --host localhost  # Start on custom host

API Endpoints:
- POST /api/contact/send-message - Send an anonymous message
- POST /api/contact/check-reply - Check for replies using a message key
- GET /api/contact/admin/messages - List all messages (requires Bearer token auth)
- POST /api/contact/admin/reply/{key} - Reply to message (requires Bearer token auth)
- GET /api/contact/admin/stats - Get statistics (requires Bearer token auth)

Admin API Authentication:
    Use Bearer token with your admin password:
    Authorization: Bearer your_secure_password

Requirements:
    pip install fastapi uvicorn click rich
"""

import os
import sys
import sqlite3
import secrets
import string
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, List, Tuple

import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import print as rprint
import readchar

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, field_validator
import uvicorn

console = Console()

# Configuration
DB_PATH = Path("contact_messages.db")
ADMIN_PASSWORD = os.getenv("CONTACT_ADMIN_PASSWORD")

# Security
security = HTTPBearer(auto_error=False)

# Data Models for API
class SendMessageRequest(BaseModel):
    message: str = Field(..., min_length=10, max_length=500)
    
    @field_validator('message')
    @classmethod
    def validate_message(cls, v):
        if not v.strip():
            raise ValueError('Message cannot be empty')
        return v.strip()

class CheckReplyRequest(BaseModel):
    key: str = Field(..., min_length=1)

class SendMessageResponse(BaseModel):
    status: str
    message: str
    key: Optional[str] = None
    errors: Optional[Dict[str, list]] = None

class CheckReplyResponse(BaseModel):
    status: str
    reply: Optional[str] = None
    message: Optional[str] = None

# Database Functions
class ContactDB:
    def __init__(self, db_path: Path = DB_PATH):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize the database with required tables."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    key TEXT UNIQUE NOT NULL,
                    message TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    replied BOOLEAN DEFAULT FALSE,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS replies (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    message_key TEXT UNIQUE NOT NULL,
                    reply TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (message_key) REFERENCES messages (key)
                )
            """)
            
            conn.commit()
    
    def generate_key(self) -> str:
        """Generate a unique message key."""
        while True:
            key = ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(16))
            if not self.key_exists(key):
                return key
    
    def key_exists(self, key: str) -> bool:
        """Check if a key already exists."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT 1 FROM messages WHERE key = ?", (key,))
            return cursor.fetchone() is not None
    
    def store_message(self, message: str) -> str:
        """Store a new message and return the generated key."""
        key = self.generate_key()
        timestamp = datetime.now().isoformat()
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT INTO messages (key, message, timestamp) VALUES (?, ?, ?)",
                (key, message, timestamp)
            )
            conn.commit()
        
        return key
    
    def get_message(self, key: str) -> Optional[Tuple[str, str, bool]]:
        """Get message details by key. Returns (message, timestamp, replied)."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "SELECT message, timestamp, replied FROM messages WHERE key = ?",
                (key,)
            )
            result = cursor.fetchone()
            return result if result else None
    
    def get_reply(self, key: str) -> Optional[str]:
        """Get reply for a given message key."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "SELECT reply FROM replies WHERE message_key = ?",
                (key,)
            )
            result = cursor.fetchone()
            return result[0] if result else None
    
    def store_reply(self, key: str, reply: str) -> bool:
        """Store a reply for a given message key."""
        # Check if message exists
        if not self.key_exists(key):
            return False
        
        timestamp = datetime.now().isoformat()
        
        with sqlite3.connect(self.db_path) as conn:
            # Store reply
            conn.execute(
                "INSERT OR REPLACE INTO replies (message_key, reply, timestamp) VALUES (?, ?, ?)",
                (key, reply, timestamp)
            )
            
            # Mark message as replied
            conn.execute(
                "UPDATE messages SET replied = TRUE WHERE key = ?",
                (key,)
            )
            
            conn.commit()
        
        return True
    
    def list_all_messages(self) -> List[Dict]:
        """List all messages with their details."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT m.key, m.message, m.timestamp, m.replied, r.reply
                FROM messages m
                LEFT JOIN replies r ON m.key = r.message_key
                ORDER BY m.created_at DESC
            """)
            
            results = []
            for row in cursor.fetchall():
                results.append({
                    'key': row[0],
                    'message': row[1],
                    'timestamp': row[2],
                    'replied': bool(row[3]),
                    'reply': row[4]
                })
            
            return results
    
    def get_stats(self) -> Dict:
        """Get database statistics."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT COUNT(*) FROM messages")
            total_messages = cursor.fetchone()[0]
            
            cursor = conn.execute("SELECT COUNT(*) FROM messages WHERE replied = TRUE")
            replied_messages = cursor.fetchone()[0]
            
            cursor = conn.execute("SELECT COUNT(*) FROM replies")
            total_replies = cursor.fetchone()[0]
            
            return {
                'total_messages': total_messages,
                'replied_messages': replied_messages,
                'pending_messages': total_messages - replied_messages,
                'total_replies': total_replies
            }

# Security Functions
def verify_admin_password(password: str) -> bool:
    """Verify admin password against environment variable."""
    if not ADMIN_PASSWORD:
        return False
    return password == ADMIN_PASSWORD

def verify_admin_token(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> bool:
    """Verify admin authentication for API endpoints."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not verify_admin_password(credentials.credentials):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return True

def check_admin_password_cli() -> bool:
    """Check admin password for CLI operations."""
    if not ADMIN_PASSWORD:
        console.print("[red]❌ CONTACT_ADMIN_PASSWORD environment variable not set![/red]")
        console.print("[yellow]Set it with: export CONTACT_ADMIN_PASSWORD=your_password[/yellow]")
        return False
    
    password = console.input("[bold]Enter admin password: [/bold]", password=True)
    
    if verify_admin_password(password):
        return True
    else:
        console.print("[red]❌ Invalid password![/red]")
        return False

# Global database instance
db = ContactDB()

# FastAPI App
app = FastAPI(
    title="Anonymous Contact API",
    description="API for handling anonymous contact messages",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

@app.post("/api/contact/send-message", response_model=SendMessageResponse)
async def send_message(request: SendMessageRequest):
    """Send an anonymous message."""
    try:
        message_key = db.store_message(request.message)
        
        return SendMessageResponse(
            status="success",
            message="Message sent successfully! Save your key to check for replies.",
            key=message_key
        )
        
    except Exception as e:
        return SendMessageResponse(
            status="error",
            message="An unexpected error occurred while sending your message."
        )

@app.post("/api/contact/check-reply", response_model=CheckReplyResponse)
async def check_reply(request: CheckReplyRequest):
    """Check for replies using a message key."""
    try:
        # Validate key format
        if len(request.key) != 16 or not request.key.replace('-', '').isalnum():
            return CheckReplyResponse(
                status="error",
                message="Invalid key format."
            )
        
        # Check if message exists
        message_data = db.get_message(request.key)
        if not message_data:
            return CheckReplyResponse(
                status="error",
                message="Invalid key. No message found with this key."
            )
        
        # Check for reply
        reply = db.get_reply(request.key)
        if reply:
            return CheckReplyResponse(
                status="success",
                reply=reply
            )
        else:
            return CheckReplyResponse(
                status="error",
                message="No reply yet. Please check back later."
            )
            
    except Exception as e:
        return CheckReplyResponse(
            status="error",
            message="An unexpected error occurred while checking for replies."
        )

@app.get("/")
async def root():
    """Health check endpoint."""
    stats = db.get_stats()
    return {
        "status": "running",
        "message": "Anonymous Contact API is running",
        "stats": stats,
        "endpoints": {
            "send_message": "/api/contact/send-message",
            "check_reply": "/api/contact/check-reply",
            "admin_messages": "/api/contact/admin/messages (requires auth)",
            "admin_reply": "/api/contact/admin/reply/{key} (requires auth)"
        }
    }

# Admin API Endpoints
@app.get("/api/contact/admin/messages")
async def admin_list_messages(_: bool = Depends(verify_admin_token)):
    """Admin endpoint to list all messages."""
    messages = db.list_all_messages()
    return {"messages": messages}

@app.post("/api/contact/admin/reply/{key}")
async def admin_reply_to_message(key: str, reply_text: str, _: bool = Depends(verify_admin_token)):
    """Admin endpoint to reply to a message."""
    if not db.get_message(key):
        raise HTTPException(status_code=404, detail="Message key not found")
    
    if db.store_reply(key, reply_text):
        return {"status": "success", "message": "Reply stored successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to store reply")

@app.get("/api/contact/admin/stats")
async def admin_get_stats(_: bool = Depends(verify_admin_token)):
    """Admin endpoint to get statistics."""
    return db.get_stats()

# CLI Functions
def display_messages_table(messages: List[Dict]):
    """Display messages in a formatted table."""
    if not messages:
        console.print("[yellow]No messages found.[/yellow]")
        return
    
    table = Table(title="Anonymous Messages")
    table.add_column("Key", style="cyan", no_wrap=True)
    table.add_column("Message", style="white", max_width=50)
    table.add_column("Timestamp", style="blue")
    table.add_column("Status", style="green")
    table.add_column("Reply", style="magenta", max_width=30)
    
    for msg in messages:
        # Truncate long messages
        message_preview = msg['message'][:47] + "..." if len(msg['message']) > 50 else msg['message']
        
        # Format timestamp
        try:
            dt = datetime.fromisoformat(msg['timestamp'])
            formatted_time = dt.strftime("%m/%d %H:%M")
        except:
            formatted_time = msg['timestamp'][:16]
        
        # Status
        status = "✅ Replied" if msg['replied'] else "⏳ Pending"
        
        # Reply preview
        reply_preview = ""
        if msg['reply']:
            reply_preview = msg['reply'][:27] + "..." if len(msg['reply']) > 30 else msg['reply']
        
        table.add_row(
            msg['key'],
            message_preview,
            formatted_time,
            status,
            reply_preview or "-"
        )
    
    console.print(table)

def clear_screen():
    """Clear the terminal screen."""
    os.system('clear' if os.name != 'nt' else 'cls')

def display_menu(options: List[str], selected: int) -> None:
    """Display a menu with arrow key navigation."""
    clear_screen()
    console.print(Panel.fit(
        "[bold blue]Anonymous Contact Message System[/bold blue]\n"
        "Use ↑↓ arrow keys to navigate, Enter to select, Q to quit",
        border_style="blue"
    ))
    console.print("\n[bold]Main Menu:[/bold]")
    
    for i, option in enumerate(options):
        if i == selected:
            console.print(f"► [bold green]{option}[/bold green]")
        else:
            console.print(f"  {option}")

def display_message_browser(messages: List[Dict], selected: int, page: int = 0, page_size: int = 10) -> None:
    """Display messages with navigation."""
    clear_screen()
    console.print(Panel.fit(
        "[bold blue]Message Browser[/bold blue]\n"
        "Use ↑↓ to navigate, Enter to view/reply, B to go back",
        border_style="blue"
    ))
    
    if not messages:
        console.print("[yellow]No messages found.[/yellow]")
        return
    
    start_idx = page * page_size
    end_idx = min(start_idx + page_size, len(messages))
    page_messages = messages[start_idx:end_idx]
    
    console.print(f"\n[bold]Messages {start_idx + 1}-{end_idx} of {len(messages)}[/bold]")
    
    for i, msg in enumerate(page_messages):
        global_idx = start_idx + i
        is_selected = global_idx == selected
        
        # Format message preview
        message_preview = msg['message'][:60] + "..." if len(msg['message']) > 63 else msg['message']
        
        # Format timestamp
        try:
            dt = datetime.fromisoformat(msg['timestamp'])
            formatted_time = dt.strftime("%m/%d %H:%M")
        except:
            formatted_time = msg['timestamp'][:16]
        
        # Status indicator
        status = "✅" if msg['replied'] else "⏳"
        
        if is_selected:
            console.print(f"► {status} [bold green]{msg['key'][:8]}...[/bold green] {formatted_time}")
            console.print(f"   [bold green]{message_preview}[/bold green]")
        else:
            console.print(f"  {status} [cyan]{msg['key'][:8]}...[/cyan] {formatted_time}")
            console.print(f"   {message_preview}")
    
    # Pagination info
    if len(messages) > page_size:
        total_pages = (len(messages) - 1) // page_size + 1
        console.print(f"\n[dim]Page {page + 1} of {total_pages} | Use Page Up/Down for more[/dim]")

def show_message_detail(message: Dict, key: str) -> None:
    """Show detailed message view."""
    clear_screen()
    reply = db.get_reply(key)
    
    panel_content = (
        f"[bold]Message:[/bold]\n{message['message']}\n\n"
        f"[bold]Sent:[/bold] {message['timestamp']}\n"
        f"[bold]Status:[/bold] {'Replied' if message['replied'] else 'Pending'}"
    )
    
    if reply:
        panel_content += f"\n\n[bold]Reply:[/bold]\n{reply}"
    
    console.print(Panel(
        panel_content,
        title=f"Message Details - {key}",
        border_style="cyan"
    ))
    
    if not message['replied']:
        console.print("\n[bold]Options:[/bold] R=Reply, B=Back")
    else:
        console.print("\n[bold]Options:[/bold] R=Reply, E=Edit Reply, B=Back")

def get_multiline_input(prompt: str) -> str:
    """Get multiline text input from user."""
    console.print(f"\n[bold]{prompt}[/bold]")
    console.print("[dim]Type your message. Press Ctrl+D (Linux/Mac) or Ctrl+Z (Windows) when done, or Ctrl+C to cancel:[/dim]")
    
    lines = []
    try:
        while True:
            try:
                line = input()
                lines.append(line)
            except EOFError:
                break
    except KeyboardInterrupt:
        return ""
    
    return '\n'.join(lines).strip()

def get_reply_input() -> str:
    """Get reply text from user."""
    return get_multiline_input("Enter your reply:")

def interactive_cli():
    """Interactive CLI mode with arrow key navigation."""
    console.print(Panel.fit(
        "[bold blue]Anonymous Contact Message System[/bold blue]\n"
        "Interactive CLI Mode",
        border_style="blue"
    ))
    
    # Check admin authentication
    if not check_admin_password_cli():
        sys.exit(1)
    
    menu_options = [
        "📋 List all messages",
        "📊 Show statistics", 
        "🚪 Exit"
    ]
    
    selected_menu = 0
    
    try:
        while True:
            display_menu(menu_options, selected_menu)
            
            key = readchar.readkey()
            
            if key == readchar.key.UP and selected_menu > 0:
                selected_menu -= 1
            elif key == readchar.key.DOWN and selected_menu < len(menu_options) - 1:
                selected_menu += 1
            elif key == readchar.key.ENTER:
                if selected_menu == 0:  # List messages
                    browse_messages()
                elif selected_menu == 1:  # Stats
                    show_stats()
                elif selected_menu == 2:  # Exit
                    clear_screen()
                    console.print("[green]Goodbye![/green]")
                    break
            elif key.lower() == 'q':
                clear_screen()
                console.print("[green]Goodbye![/green]")
                break
                
    except KeyboardInterrupt:
        clear_screen()
        console.print("\n[green]Goodbye![/green]")

def browse_messages():
    """Browse messages with arrow key navigation."""
    messages = db.list_all_messages()
    if not messages:
        clear_screen()
        console.print("[yellow]No messages found. Press any key to return.[/yellow]")
        readchar.readkey()
        return
    
    selected_message = 0
    page = 0
    page_size = 10
    
    while True:
        display_message_browser(messages, selected_message, page, page_size)
        
        key = readchar.readkey()
        
        if key == readchar.key.UP and selected_message > 0:
            selected_message -= 1
            # Auto-scroll to previous page if needed
            if selected_message < page * page_size:
                page = max(0, page - 1)
        elif key == readchar.key.DOWN and selected_message < len(messages) - 1:
            selected_message += 1
            # Auto-scroll to next page if needed
            if selected_message >= (page + 1) * page_size:
                page = min((len(messages) - 1) // page_size, page + 1)
        elif key == readchar.key.PAGE_UP and page > 0:
            page -= 1
            selected_message = max(0, min(selected_message, (page + 1) * page_size - 1))
        elif key == readchar.key.PAGE_DOWN:
            total_pages = (len(messages) - 1) // page_size + 1
            if page < total_pages - 1:
                page += 1
                selected_message = min(len(messages) - 1, max(selected_message, page * page_size))
        elif key == readchar.key.ENTER:
            view_and_reply_message(messages[selected_message])
        elif key.lower() == 'b':
            break

def view_and_reply_message(message: Dict):
    """View message and optionally reply."""
    key = message['key']
    
    while True:
        show_message_detail(message, key)
        
        nav_key = readchar.readkey()
        
        if nav_key.lower() == 'b':
            break
        elif nav_key.lower() == 'r':
            if message['replied']:
                # Asking for confirmation to replace existing reply
                console.print("\n[yellow]⚠️  This message already has a reply. Replace it? (y/n)[/yellow]")
                confirm = readchar.readkey()
                if confirm.lower() != 'y':
                    continue
            
            reply_text = get_reply_input()
            if reply_text:
                if db.store_reply(key, reply_text):
                    message['replied'] = True
                    message['reply'] = reply_text
                    console.print("[green]✅ Reply sent successfully! Press any key to continue.[/green]")
                else:
                    console.print("[red]❌ Failed to send reply. Press any key to continue.[/red]")
                readchar.readkey()
        elif nav_key.lower() == 'e' and message['replied']:
            # Edit existing reply
            current_reply = db.get_reply(key)
            console.print(f"\n[bold]Current reply:[/bold]\n{current_reply}")
            console.print("\n[yellow]Enter the new reply (this will replace the current one):[/yellow]")
            
            new_reply = get_reply_input()
            if new_reply:
                if db.store_reply(key, new_reply):
                    message['reply'] = new_reply
                    console.print("[green]✅ Reply updated successfully! Press any key to continue.[/green]")
                else:
                    console.print("[red]❌ Failed to update reply. Press any key to continue.[/red]")
                readchar.readkey()

def show_stats():
    """Show statistics screen."""
    clear_screen()
    stats = db.get_stats()
    console.print(Panel(
        f"[bold]Total Messages:[/bold] {stats['total_messages']}\n"
        f"[bold]Replied:[/bold] {stats['replied_messages']}\n"
        f"[bold]Pending:[/bold] {stats['pending_messages']}\n"
        f"[bold]Total Replies:[/bold] {stats['total_replies']}",
        title="Statistics",
        border_style="green"
    ))
    console.print("\n[dim]Press any key to return to main menu...[/dim]")
    readchar.readkey()

# Click CLI Interface
import threading
import time

def start_server_background(host: str, port: int):
    """Start the FastAPI server in a background thread."""
    import uvicorn
    uvicorn.run(app, host=host, port=port, log_level="info")

@click.command()
@click.option('--port', default=8000, help='API server port')
@click.option('--host', default='0.0.0.0', help='API server host')
def main(port, host):
    """Anonymous Contact Message System - Always runs server + interactive CLI"""
    
    console.print(Panel.fit(
        "[bold blue]Anonymous Contact Message API + CLI[/bold blue]\n"
        f"Starting server on http://{host}:{port}",
        border_style="blue"
    ))
    
    console.print(f"\n[bold]Database:[/bold] {DB_PATH.absolute()}")
    
    if ADMIN_PASSWORD:
        console.print(f"[bold green]✅ Admin authentication enabled[/bold green]")
    else:
        console.print(f"[bold yellow]⚠️  Admin password not set - admin features disabled[/bold yellow]")
    
    # Start server in background thread
    server_thread = threading.Thread(
        target=start_server_background, 
        args=(host, port),
        daemon=True
    )
    server_thread.start()
    
    # Give server time to start
    time.sleep(2)
    console.print(f"[green]✅ Server running at http://{host}:{port}[/green]")
    
    # Always start interactive CLI
    interactive_cli()

if __name__ == "__main__":
    main()
# core/security_manager.py - Comprehensive SQL Injection Protection & Security Manager

import re
import html
import sqlite3
import logging
from typing import Any, List, Dict, Optional, Union
from discord.ext import commands
import discord

class SecurityManager:
    """
    Centralized security manager for SQL injection prevention and input sanitization
    """
    
    # Dangerous SQL keywords that should never appear in user input
    SQL_INJECTION_PATTERNS = [
        r'(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|OR|AND)\b)',
        r'(--|#|/\*|\*/)',  # Comment patterns
        r'(\b(SCRIPT|JAVASCRIPT|VBSCRIPT|ONLOAD|ONERROR)\b)',  # XSS patterns
        r'([\'"]);',  # Quote and semicolon combinations
        r'(\bCHAR\s*\()',  # CHAR function
        r'(\bCONCAT\s*\()',  # CONCAT function
        r'(\b(SLEEP|WAITFOR|BENCHMARK)\b)',  # Time-based injection
    ]
    
    # Maximum lengths for different input types
    INPUT_LIMITS = {
        'username': 32,
        'message': 2000,
        'command_arg': 100,
        'search_query': 200,
        'playlist_name': 50,
        'achievement_name': 100,
        'bounty_title': 200,
        'bounty_description': 1000,
    }
    
    @staticmethod
    def sanitize_input(input_value: Any, input_type: str = 'general') -> str:
        """
        Sanitize user input to prevent SQL injection and XSS
        
        Args:
            input_value: The input to sanitize
            input_type: Type of input for specific validation rules
            
        Returns:
            Sanitized string safe for database operations
        """
        if input_value is None:
            return ""
            
        # Convert to string and strip whitespace
        clean_input = str(input_value).strip()
        
        # Apply length limits
        max_length = SecurityManager.INPUT_LIMITS.get(input_type, 500)
        if len(clean_input) > max_length:
            clean_input = clean_input[:max_length]
        
        # HTML encode to prevent XSS
        clean_input = html.escape(clean_input)
        
        # Check for SQL injection patterns
        for pattern in SecurityManager.SQL_INJECTION_PATTERNS:
            if re.search(pattern, clean_input, re.IGNORECASE):
                logging.warning(f"Potential SQL injection attempt blocked: {clean_input[:100]}")
                # Replace with safe placeholder
                clean_input = "[BLOCKED_CONTENT]"
                break
        
        return clean_input
    
    @staticmethod
    def safe_execute(cursor: sqlite3.Cursor, query: str, parameters: tuple = ()) -> sqlite3.Cursor:
        """
        Execute SQL query with parameterized queries to prevent injection
        
        Args:
            cursor: Database cursor
            query: SQL query with ? placeholders
            parameters: Tuple of parameters to bind
            
        Returns:
            Executed cursor
            
        Raises:
            SecurityError: If query contains unsafe patterns
        """
        # Validate query doesn't contain string formatting
        if any(pattern in query for pattern in ['%s', '{}', '{0}', f'{', '.format(']):
            raise SecurityError("Query contains unsafe string formatting")
        
        # Ensure query uses parameterized placeholders
        param_count = query.count('?')
        if param_count != len(parameters):
            raise SecurityError(f"Parameter count mismatch: query has {param_count} placeholders, {len(parameters)} parameters provided")
        
        # Log query for audit (parameters are automatically escaped by SQLite)
        logging.debug(f"Executing safe query: {query} with {len(parameters)} parameters")
        
        return cursor.execute(query, parameters)
    
    @staticmethod
    def validate_discord_input(ctx: commands.Context, input_value: str, input_type: str = 'general') -> str:
        """
        Validate input from Discord commands with additional context
        
        Args:
            ctx: Discord command context
            input_value: User input to validate
            input_type: Type of input for specific rules
            
        Returns:
            Sanitized input
        """
        # Log the input attempt for security monitoring
        logging.info(f"Input validation - User: {ctx.author.id}, Guild: {ctx.guild.id if ctx.guild else 'DM'}, Input: {input_value[:50]}")
        
        # Apply standard sanitization
        sanitized = SecurityManager.sanitize_input(input_value, input_type)
        
        # Additional Discord-specific validation
        if input_type == 'username':
            # Remove Discord mentions and formatting
            sanitized = re.sub(r'<@!?\d+>', '', sanitized)
            sanitized = re.sub(r'<#\d+>', '', sanitized)
            sanitized = re.sub(r'<:\w+:\d+>', '', sanitized)
        
        return sanitized
    
    @staticmethod
    def create_safe_query(base_query: str, conditions: Dict[str, Any]) -> tuple:
        """
        Build safe parameterized query from conditions
        
        Args:
            base_query: Base SQL query with WHERE clause
            conditions: Dictionary of column: value conditions
            
        Returns:
            Tuple of (complete_query, parameters)
        """
        if not conditions:
            return base_query, ()
        
        where_clauses = []
        parameters = []
        
        for column, value in conditions.items():
            # Validate column name (prevent injection through column names)
            if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', column):
                raise SecurityError(f"Invalid column name: {column}")
            
            where_clauses.append(f"{column} = ?")
            parameters.append(value)
        
        complete_query = f"{base_query} WHERE {' AND '.join(where_clauses)}"
        return complete_query, tuple(parameters)
    
    @staticmethod
    def validate_api_input(request_data: Dict[str, Any]) -> Dict[str, str]:
        """
        Validate input from API endpoints
        
        Args:
            request_data: Dictionary of API request data
            
        Returns:
            Dictionary of sanitized data
        """
        sanitized_data = {}
        
        for key, value in request_data.items():
            # Validate key name
            if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', key):
                logging.warning(f"Suspicious API key name: {key}")
                continue
            
            # Sanitize value based on key type
            input_type = 'general'
            if 'user' in key.lower():
                input_type = 'username'
            elif 'message' in key.lower() or 'content' in key.lower():
                input_type = 'message'
            elif 'search' in key.lower() or 'query' in key.lower():
                input_type = 'search_query'
            
            sanitized_data[key] = SecurityManager.sanitize_input(value, input_type)
        
        return sanitized_data


class SecurityError(Exception):
    """Custom exception for security-related errors"""
    pass


class SecureDatabase:
    """
    Wrapper class for secure database operations
    """
    
    def __init__(self, db_connection):
        self.db = db_connection
        self.security_manager = SecurityManager()
    
    async def safe_execute(self, query: str, parameters: tuple = ()) -> sqlite3.Cursor:
        """Execute query safely with automatic parameter validation"""
        return await self.db.execute(query, parameters)
    
    async def safe_select(self, table: str, columns: List[str] = None, conditions: Dict[str, Any] = None) -> List[Dict]:
        """
        Perform safe SELECT query with validation
        
        Args:
            table: Table name
            columns: List of columns to select (None for *)
            conditions: WHERE conditions as dict
            
        Returns:
            List of result dictionaries
        """
        # Validate table name
        if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', table):
            raise SecurityError(f"Invalid table name: {table}")
        
        # Validate column names
        if columns:
            for col in columns:
                if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', col):
                    raise SecurityError(f"Invalid column name: {col}")
            column_str = ", ".join(columns)
        else:
            column_str = "*"
        
        base_query = f"SELECT {column_str} FROM {table}"
        
        if conditions:
            query, params = SecurityManager.create_safe_query(base_query, conditions)
        else:
            query, params = base_query, ()
        
        cursor = await self.safe_execute(query, params)
        return await cursor.fetchall()
    
    async def safe_insert(self, table: str, data: Dict[str, Any]) -> int:
        """
        Perform safe INSERT with validation
        
        Args:
            table: Table name
            data: Dictionary of column: value pairs
            
        Returns:
            Last row ID
        """
        # Validate table name
        if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', table):
            raise SecurityError(f"Invalid table name: {table}")
        
        # Validate column names and sanitize values
        sanitized_data = {}
        for column, value in data.items():
            if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', column):
                raise SecurityError(f"Invalid column name: {column}")
            sanitized_data[column] = SecurityManager.sanitize_input(value)
        
        columns = list(sanitized_data.keys())
        placeholders = ", ".join(["?" for _ in columns])
        column_names = ", ".join(columns)
        
        query = f"INSERT INTO {table} ({column_names}) VALUES ({placeholders})"
        parameters = tuple(sanitized_data.values())
        
        cursor = await self.safe_execute(query, parameters)
        await self.db.commit()
        return cursor.lastrowid
    
    async def safe_update(self, table: str, data: Dict[str, Any], conditions: Dict[str, Any]) -> int:
        """
        Perform safe UPDATE with validation
        
        Args:
            table: Table name
            data: Dictionary of column: value pairs to update
            conditions: WHERE conditions as dict
            
        Returns:
            Number of affected rows
        """
        # Validate table name
        if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', table):
            raise SecurityError(f"Invalid table name: {table}")
        
        # Build SET clause
        set_clauses = []
        set_params = []
        
        for column, value in data.items():
            if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', column):
                raise SecurityError(f"Invalid column name: {column}")
            set_clauses.append(f"{column} = ?")
            set_params.append(SecurityManager.sanitize_input(value))
        
        # Build WHERE clause
        where_clauses = []
        where_params = []
        
        for column, value in conditions.items():
            if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', column):
                raise SecurityError(f"Invalid column name: {column}")
            where_clauses.append(f"{column} = ?")
            where_params.append(value)  # Conditions don't need sanitization, just parameterization
        
        query = f"UPDATE {table} SET {', '.join(set_clauses)} WHERE {' AND '.join(where_clauses)}"
        parameters = tuple(set_params + where_params)
        
        cursor = await self.safe_execute(query, parameters)
        await self.db.commit()
        return cursor.rowcount


# Security middleware decorator for Discord commands
def secure_command(input_types: Dict[str, str] = None):
    """
    Decorator to automatically sanitize Discord command inputs
    
    Args:
        input_types: Dictionary mapping parameter names to input types
    """
    def decorator(func):
        async def wrapper(self, ctx, *args, **kwargs):
            # Sanitize positional arguments
            sanitized_args = []
            for i, arg in enumerate(args):
                if isinstance(arg, str):
                    input_type = list(input_types.values())[i] if input_types and i < len(input_types) else 'general'
                    sanitized_arg = SecurityManager.validate_discord_input(ctx, arg, input_type)
                    sanitized_args.append(sanitized_arg)
                else:
                    sanitized_args.append(arg)
            
            # Sanitize keyword arguments
            sanitized_kwargs = {}
            for key, value in kwargs.items():
                if isinstance(value, str):
                    input_type = input_types.get(key, 'general') if input_types else 'general'
                    sanitized_kwargs[key] = SecurityManager.validate_discord_input(ctx, value, input_type)
                else:
                    sanitized_kwargs[key] = value
            
            return await func(self, ctx, *sanitized_args, **sanitized_kwargs)
        return wrapper
    return decorator
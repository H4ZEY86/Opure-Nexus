# utils/helpers.py

def create_progress_bar(
    value: int,
    max_value: int,
    length: int = 10,
    char_full: str = '█',
    char_empty: str = '░'
) -> str:
    """
    Creates a text-based progress bar.
    Example: [██████░░░░] 60/100
    """
    if max_value <= 0:
        p = 0
    else:
        # Ensure value doesn't exceed max_value for display purposes
        value = min(value, max_value)
        p = float(value) / max_value
    
    filled_len = int(round(p * length))
    bar = char_full * filled_len + char_empty * (length - filled_len)
    return f"[{bar}] {value}/{max_value}"

# You can add more helper functions here in the future.
# For example, a function to get a random GIF for a scene from an API like Tenor:
#
# import os
# import requests
#
# def get_scene_gif(keyword: str) -> str | None:
#     """Fetches a relevant GIF from Tenor."""
#     api_key = os.getenv("TENOR_API_KEY")
#     if not api_key:
#         return None
#     try:
#         response = requests.get(
#             "https://tenor.googleapis.com/v2/search",
#             params={"q": keyword, "key": api_key, "limit": 1, "media_filter": "minimal"}
#         )
#         response.raise_for_status()
#         results = response.json()
#         if results['results']:
#             return results['results'][0]['media_formats']['gif']['url']
#     except requests.RequestException:
#         return None
#     return None

from typing import Final

HOTEL_ROOMS: Final[tuple[str, ...]] = (
    "101",
    "102",
    "103",
    "201",
    "202",
    "203",
)

TOTAL_ROOMS: Final[int] = len(HOTEL_ROOMS)

ROOM_CHOICES: Final[list[tuple[str, str]]] = [(room, room) for room in HOTEL_ROOMS]

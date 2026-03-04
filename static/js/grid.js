// Manages grid cell selection, marker display, and last-clicked time sync with the Flask backend.
const grid = document.querySelector('.grid');

if (grid) {
  const cells = Array.from(grid.querySelectorAll('.cell'));
  const columnCount = 7;
  // Marker text displayed in the selected grid cell.
  const markerText = 'WS3254';
  // Backend endpoint for loading/saving selected cell state.
  const markerApiUrl = '/api/marker';
  const lastClickedTimeElement = document.querySelector('#last-clicked-time');

  // Normalize stored date text so older formats can still be displayed.
  const formatClickedDateTime = (clickedAt) => {
    if (typeof clickedAt !== 'string' || clickedAt.trim() === '') {
      return '';
    }

    const trimmedValue = clickedAt.trim();

    const alreadyFormattedPattern = /^\d{1,2}\s[A-Za-z]{3}\s\d{4}(\s\d{2}:\d{2}:\d{2})?$/;
    if (alreadyFormattedPattern.test(trimmedValue)) {
      return trimmedValue;
    }

    const isoPattern = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?/;
    const isoMatch = trimmedValue.match(isoPattern);
    if (!isoMatch) {
      return trimmedValue;
    }

    const year = Number.parseInt(isoMatch[1], 10);
    const month = Number.parseInt(isoMatch[2], 10);
    const day = Number.parseInt(isoMatch[3], 10);
    const hours = isoMatch[4];
    const minutes = isoMatch[5];
    const seconds = isoMatch[6];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return trimmedValue;
    }

    const datePart = `${day} ${monthNames[month - 1]} ${year}`;
    if (hours && minutes && seconds) {
      return `${datePart} ${hours}:${minutes}:${seconds}`;
    }

    return datePart;
  };

  // Render last clicked timestamp below the grid.
  const setLastClickedTime = (clickedAt) => {
    if (!lastClickedTimeElement) {
      return;
    }

    if (typeof clickedAt === 'string' && clickedAt.trim() !== '') {
      lastClickedTimeElement.textContent = `Last clicked time: ${formatClickedDateTime(clickedAt)}`;
      return;
    }

    lastClickedTimeElement.textContent = 'Last clicked time: -';
  };

  // Clear marker text from all cells so only one marker is shown.
  const clearAllCText = () => {
    cells.forEach((targetCell) => {
      if (targetCell.textContent.trim() === markerText) {
        targetCell.textContent = '';
      }
    });
  };

  // Put marker text in one allowed cell (not first row/column).
  const setMarkerAtIndex = (index) => {
    const cell = cells[index];

    if (!cell) {
      return;
    }

    const isFirstRow = index < columnCount;
    const isFirstColumn = index % columnCount === 0;

    if (isFirstRow || isFirstColumn) {
      return;
    }

    clearAllCText();
    cell.textContent = markerText;
  };

  // Load previously saved marker state from server when page opens.
  const loadMarkerFromServer = async () => {
    try {
      const response = await fetch(markerApiUrl);
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      if (Number.isInteger(data.index)) {
        setMarkerAtIndex(data.index);
      }
      setLastClickedTime(data.clicked_at);
    } catch (error) {
      console.error('Failed to load marker state:', error);
    }
  };

  // Save new marker state to server after user click.
  const saveMarkerToServer = async (index) => {
    try {
      const response = await fetch(markerApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ index }),
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setLastClickedTime(data.clicked_at);
    } catch (error) {
      console.error('Failed to save marker state:', error);
    }
  };

  loadMarkerFromServer();

  cells.forEach((cell, index) => {
    const isFirstRow = index < columnCount;
    const isFirstColumn = index % columnCount === 0;

    // Disable click behavior for header row and left label column.
    if (isFirstRow || isFirstColumn) {
      return;
    }

    cell.addEventListener('click', () => {
      setMarkerAtIndex(index);
      saveMarkerToServer(index);
    });
  });
}
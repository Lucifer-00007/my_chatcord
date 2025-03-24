function parseCurlCommand(curlCommand) {
    try {
        // Remove newlines and extra spaces
        const normalizedCommand = curlCommand.replace(/\\\s*\n/g, ' ').trim();
        
        // Extract URL
        const urlMatch = normalizedCommand.match(/curl\s+(?:--location\s+)?['"]([^'"]+)['"]/);
        const endpoint = urlMatch ? urlMatch[1] : null;

        // Extract headers
        const headers = {};
        const headerMatches = normalizedCommand.matchAll(/--header\s+['"]([^:]+):\s*([^'"]+)['"]/g);
        for (const match of headerMatches) {
            headers[match[1].trim()] = match[2].trim();
        }

        // Extract method
        const methodMatch = normalizedCommand.match(/--request\s+(['"]?)(\w+)\1/);
        const method = methodMatch ? methodMatch[2] : 'POST';

        // Extract body data
        const dataPattern = /--data\s+['"]({[\s\S]*?})['"]\s*$/;
        const dataMatch = normalizedCommand.match(dataPattern);
        let body = null;
        
        if (dataMatch) {
            const bodyContent = dataMatch[1]
                .replace(/\\"/g, '"')
                .replace(/\\\n\s*/g, '')
                .trim();
            body = JSON.parse(bodyContent);
        }

        return { endpoint, headers, method, body };
    } catch (err) {
        console.error('Error parsing cURL command:', err);
        throw new Error('Invalid cURL command format: ' + err.message);
    }
}

module.exports = { parseCurlCommand };

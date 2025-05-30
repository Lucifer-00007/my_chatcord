// Enhanced curl command parser
function parseCurlCommand(curlCommand) {
  console.log('Starting cURL command parse');
  try {
    const cleaned = curlCommand
      .trim()
      .replace(/\\\n/g, ' ')
      .replace(/\s+/g, ' ');

    // Extract URL and ensure it's absolute
    const urlMatch = cleaned.match(
      /(?:--location\s+)?['"]?(https?:\/\/[^'"]+)['"]?/i
    );
    if (!urlMatch) {
      throw new Error(
        'No valid URL found in cURL command. URL must be absolute (start with http:// or https://)'
      );
    }
    const url = urlMatch[1].replace(/^['"]|['"]$/g, '');

    // Validate URL format
    try {
      new URL(url); // This will throw if URL is invalid
    } catch (urlError) {
      throw new Error(
        'Invalid URL format. Must be an absolute URL starting with http:// or https://'
      );
    }

    // Extract headers
    const headers = {};
    const headerRegex = /--header\s+['"]([^:]+):\s*([^'"]+)['"]/g;
    let headerMatch;
    while ((headerMatch = headerRegex.exec(cleaned)) !== null) {
      headers[headerMatch[1].trim()] = headerMatch[2].trim();
    }

    // Extract body preserving all fields
    let body = null;
    const dataMatch = /--data\s+['"]({[\s\S]*?})['"]/g.exec(cleaned);
    if (dataMatch) {
      try {
        body = JSON.parse(dataMatch[1]);
      } catch (e) {
        console.error('Failed to parse body as JSON:', e);
        body = dataMatch[1];
      }
    }

    // Extract method
    const methodMatch = /-X\s+(\w+)/i.exec(cleaned);
    const method = methodMatch ? methodMatch[1] : body ? 'POST' : 'GET';

    console.log('Parsed curl data:', {
      url,
      method,
      headerCount: Object.keys(headers).length,
      hasBody: !!body,
    });

    return { endpoint: url, method, headers, body }; // Renamed url to endpoint for clarity
  } catch (err) {
    console.error('cURL parsing error:', err);
    throw new Error(`Failed to parse cURL command: ${err.message}`);
  }
}

module.exports = {
  parseCurlCommand,
};

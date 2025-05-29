function extractCommonName(text) {
    if (typeof text !== 'string') text = String(text || '');
    const match = /Nom\s+commun\s*:\s*([^\n]+)/i.exec(text);
    if (!match) return null;
    return match[1].replace(/\*+/g, '').trim();
}

function parseIdentifyResponse(full) {
    if (typeof full !== 'string') full = String(full || '');
    const match = /```(?:json)?\s*([\s\S]+?)\s*```/i.exec(full);
    let schedule = null;
    let description = full;
    if (match) {
        try {
            schedule = JSON.parse(match[1]);
        } catch (e) {
            schedule = null;
        }
        description = full.substring(0, match.index);
    }
    description = description
        .replace(/^(?:\s*#+.*\n)+/, '') // strip leading markdown headings
        .replace(/^\s*-+\s*\n/, '')    // strip delimiter line
        .trim();
    const commonName = extractCommonName(description);
    return { description, schedule, commonName };
}

module.exports = parseIdentifyResponse;
module.exports.extractCommonName = extractCommonName;

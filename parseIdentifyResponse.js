function extractCommonName(text) {
    if (typeof text !== 'string') text = String(text || '');
    const match = /Nom\s+commun\s*:\s*([^\n]+)/i.exec(text);
    if (!match) return null;
    return match[1].replace(/\*+/g, '').trim();
}

function parseIdentifyResponse(full) {
    if (typeof full !== 'string') full = String(full || '');
    const tryParseJson = (text) => {
        if (!text) return null;
        const trimmed = text.trim();
        try {
            return JSON.parse(trimmed);
        } catch (e) {
            const start = trimmed.indexOf('{');
            const end = trimmed.lastIndexOf('}');
            if (start !== -1 && end !== -1 && end > start) {
                try {
                    return JSON.parse(trimmed.slice(start, end + 1));
                } catch (err) {
                    return null;
                }
            }
            return null;
        }
    };

    const fenceMatch = /```(?:json)?\s*([\s\S]+?)\s*```/i.exec(full);
    let schedule = null;
    let description = full;
    if (fenceMatch) {
        schedule = tryParseJson(fenceMatch[1]);
        description = full.substring(0, fenceMatch.index);
    } else {
        const delimiter = /^---\s*$/m.exec(full);
        if (delimiter) {
            const jsonCandidate = full.slice(delimiter.index + delimiter[0].length);
            schedule = tryParseJson(jsonCandidate);
            description = full.substring(0, delimiter.index);
        }
        if (!schedule) {
            schedule = tryParseJson(full);
            if (schedule) {
                description = '';
            }
        }
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

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
    return { description, schedule };
}

module.exports = parseIdentifyResponse;

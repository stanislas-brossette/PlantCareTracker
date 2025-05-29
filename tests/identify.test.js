const parseIdentifyResponse = require('../parseIdentifyResponse');

describe('parseIdentifyResponse', () => {
  test('extracts description and JSON schedule', () => {
    const text = '# Heading\n## Another Heading\n---\nPlant description here.\n\nMore details.\n\n```json\n{ "wateringMin": [1], "wateringMax": [2], "feedingMin": [], "feedingMax": [] }\n```\n';
    const { description, schedule } = parseIdentifyResponse(text);
    expect(description).toBe('Plant description here.\n\nMore details.');
    expect(schedule.wateringMin[0]).toBe(1);
    expect(schedule.wateringMax[0]).toBe(2);
  });

  test('extracts common name when present', () => {
    const text = '**Nom scientifique :** Foo\n**Nom commun :** Bar\n---';
    const { commonName } = parseIdentifyResponse(text);
    expect(commonName).toBe('Bar');
  });

  test('handles absence of heading and delimiter', () => {
    const text = 'Desc only\n```json\n{}\n```';
    const { description, schedule } = parseIdentifyResponse(text);
    expect(description).toBe('Desc only');
    expect(schedule).toEqual({});
  });
});

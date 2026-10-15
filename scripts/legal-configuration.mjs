export const legalFields = [
  'LEGAL_PUBLISHER_NAME', 'LEGAL_PUBLISHER_ADDRESS', 'LEGAL_PUBLISHER_PHONE', 'LEGAL_PUBLICATION_DIRECTOR',
  'LEGAL_HOST_NAME', 'LEGAL_HOST_ADDRESS', 'LEGAL_HOST_PHONE', 'LEGAL_ADDITIONAL_STORAGE',
];

export function legalConfiguration(environment = process.env) {
  const configuration = {};
  const testFixture = environment.LEGAL_TEST_MODE === 'true';
  const expected = environment.DOCUSAURUS_DEPLOYMENT === 'development' ? 'development' : 'production';
  for (const field of legalFields) {
    const value = environment[field];
    // Never include supplied values in diagnostics: publication is intentional, logs are not.
    if (typeof value !== 'string' || !value.trim()) throw new Error(`Required legal configuration: ${field}`);
    if (value.length > 2000 || /[\x00-\x08\x0b\x0c\x0e-\x1f{}<>`]|\$\{|\b(?:TODO|TBD)\b/.test(value)) throw new Error(`Invalid legal text or unresolved placeholder: ${field}`);
    if (!testFixture && /TEST ONLY|CI FIXTURE/i.test(value)) throw new Error(`Test-only legal value cannot be published: ${field}`);
    configuration[field] = value.trim().replace(/\s+/g, ' ');
  }
  if (environment.LEGAL_CONFIGURATION_ENVIRONMENT !== expected) throw new Error(`LEGAL_CONFIGURATION_ENVIRONMENT must explicitly match ${expected}.`);
  if (configuration.LEGAL_PUBLICATION_DIRECTOR !== configuration.LEGAL_PUBLISHER_NAME) throw new Error('A natural-person publisher must also be the publication director (article 93-2).');
  if (!testFixture && environment.LEGAL_PUBLICATION_APPROVED !== 'true') throw new Error('LEGAL_PUBLICATION_APPROVED must confirm the publisher review before publication.');
  return { ...configuration, LEGAL_CONFIGURATION_ENVIRONMENT: expected, testFixture, approved: !testFixture && environment.LEGAL_PUBLICATION_APPROVED === 'true' };
}

export function testLegalEnvironment(environment = process.env) {
  return { ...environment,
    ...Object.fromEntries(legalFields.map((field) => [field, `TEST ONLY fictional ${field}`])),
    LEGAL_PUBLICATION_DIRECTOR: 'TEST ONLY fictional LEGAL_PUBLISHER_NAME',
    LEGAL_CONFIGURATION_ENVIRONMENT: environment.DOCUSAURUS_DEPLOYMENT === 'development' ? 'development' : 'production',
    LEGAL_TEST_MODE: 'true', LEGAL_PUBLICATION_APPROVED: 'false',
  };
}

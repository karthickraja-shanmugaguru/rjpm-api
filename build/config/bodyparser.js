import { defineConfig } from '@adonisjs/core/bodyparser';
const bodyParserConfig = defineConfig({
    allowedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
    form: {
        convertEmptyStringsToNull: true,
        types: ['application/x-www-form-urlencoded'],
        limit: '50mb',
    },
    json: {
        convertEmptyStringsToNull: true,
        types: [
            'application/json',
            'application/json-patch+json',
            'application/vnd.api+json',
            'application/csp-report',
        ],
        limit: '50mb',
    },
    multipart: {
        autoProcess: true,
        convertEmptyStringsToNull: true,
        processManually: [],
        limit: '50mb',
        types: ['multipart/form-data'],
    },
});
export default bodyParserConfig;
//# sourceMappingURL=bodyparser.js.map
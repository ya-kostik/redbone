var redboneCore = require('./lib/redbone'),
    getServerDispatchMidddleware = require('./client/getServerDispatchMidddleware');

/**
 * Incuding client helper function to core file
 * for more confortable importing
 */

redboneCore.getServerDispatchMidddleware = getServerDispatchMidddleware;

module.exports = redboneCore;

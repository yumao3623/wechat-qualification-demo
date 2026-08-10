const systemClock = Object.freeze({
  now() {
    return new Date();
  }
});

function nowIso(clock) {
  return clock.now().toISOString();
}

module.exports = { nowIso, systemClock };

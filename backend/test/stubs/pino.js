const l = { info() {}, warn() {}, error() {}, fatal() {}, debug() {}, trace() {}, child() { return l; } };
export default () => l;

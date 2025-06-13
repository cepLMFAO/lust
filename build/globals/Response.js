class Response {
  constructor(data, options = {}) {
    this.data = data;
    this.status = options.status != null ? options.status : 200;
  }

  async text() {
    return this.data;
  }

  async json() {
    const text = await this.text();
    return JSON.parse(text);
  }

  get ok() {
    return this.status >= 200 && this.status < 300;
  }
}

module.exports = Response;

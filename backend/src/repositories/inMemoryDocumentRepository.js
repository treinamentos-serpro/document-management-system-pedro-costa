class InMemoryDocumentRepository {
  constructor() {
    this.documents = new Map();
  }

  async create(document) {
    this.documents.set(document.id, document);
    return document;
  }

  async findByOwner(owner) {
    return [...this.documents.values()]
      .filter((document) => document.owner === owner)
      .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt));
  }

  async findById(id) {
    return this.documents.get(id) || null;
  }
}

module.exports = InMemoryDocumentRepository;
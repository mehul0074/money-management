export class Person {
  constructor(id, name, phone, email = '', imageUri = null) {
    this.id = id;
    this.name = name;
    this.phone = phone;
    this.email = email;
    this.imageUri = imageUri;
    this.createdAt = new Date().toISOString();
  }

  static fromJSON(json) {
    const person = new Person(json.id, json.name, json.phone, json.email, json.imageUri);
    person.createdAt = json.createdAt;
    return person;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      phone: this.phone,
      email: this.email,
      imageUri: this.imageUri,
      createdAt: this.createdAt
    };
  }
}

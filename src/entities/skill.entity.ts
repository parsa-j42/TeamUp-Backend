export class Skill {
  private readonly id: string;
  private name: string;
  private category: string;

  constructor(id: string, name: string, category: string) {
    this.id = id;
    this.name = name;
    this.category = category;
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getCategory(): string {
    return this.category;
  }
}

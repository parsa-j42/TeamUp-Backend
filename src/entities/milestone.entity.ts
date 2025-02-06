export class Milestone {
  private readonly id: string;
  private title: string;
  private deadline: Date;
  private status: string;

  constructor(id: string, title: string, deadline: Date, status: string = 'pending') {
    this.id = id;
    this.title = title;
    this.deadline = deadline;
    this.status = status;
  }

  updateStatus(status: string): void {
    this.status = status;
  }

  getStatus(): string {
    return this.status;
  }

  getId(): string {
    return this.id;
  }

  getTitle(): string {
    return this.title;
  }

  getDeadline(): Date {
    return this.deadline;
  }
}

export class PageQuery {
  pageNumber: number;
  pageSize: number;
  sortType: string;
  sortOrder: string;

  constructor(pageNumber: number, pageSize: number, sortType: string, sortOrder: string) {
    this.pageNumber = pageNumber;
    this.pageSize = pageSize;
    this.sortType = sortType;
    this.sortOrder = sortOrder;
  }
}

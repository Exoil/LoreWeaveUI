/**
 * Paging + sorting parameters for a list request to the backend.
 * `sortType` is the field name (e.g. `'name'`); `sortOrder` is `'Asc'`/`'Desc'`.
 */
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

/**
 * packages/core/src/stl/index.ts
 * 宿主内置 STL 容器与算法系统 (Host Built-in STL)
 *
 * 核心容器支持:
 * - vector, string, pair
 * - queue, stack, priority_queue (二叉大根堆)
 * - 算法: max, min, abs, make_pair, reverse, sort
 */

export class HostVector {
  public data: any[];

  constructor(initialSize: number = 0, defaultValue: any = 0) {
    this.data = initialSize > 0 ? new Array(initialSize).fill(defaultValue) : [];
  }

  public push_back(val: any): void {
    this.data.push(val);
  }

  public pop_back(): any {
    return this.data.pop();
  }

  public size(): number {
    return this.data.length;
  }

  public empty(): boolean {
    return this.data.length === 0;
  }

  public clear(): void {
    this.data = [];
  }

  public get(idx: number): any {
    if (idx < 0 || idx >= this.data.length) {
      throw new Error(`[RE 数组越界] vector 下标 [${idx}] 超出大小 ${this.data.length}`);
    }
    return this.data[idx];
  }

  public set(idx: number, val: any): void {
    if (idx < 0 || idx >= this.data.length) {
      throw new Error(`[RE 数组越界] vector 下标 [${idx}] 超出大小 ${this.data.length}`);
    }
    this.data[idx] = val;
  }

  public clone(): HostVector {
    const next = new HostVector();
    next.data = this.data.map((item) => (item?.clone ? item.clone() : item));
    return next;
  }
}

export class HostString {
  public data: string;

  constructor(str: string = '') {
    this.data = str;
  }

  public size(): number {
    return this.data.length;
  }

  public length(): number {
    return this.data.length;
  }

  public empty(): boolean {
    return this.data.length === 0;
  }

  public substr(pos: number, len?: number): string {
    return len !== undefined
      ? this.data.substring(pos, pos + len)
      : this.data.substring(pos);
  }

  public get(idx: number): string {
    if (idx < 0 || idx >= this.data.length) {
      throw new Error(`[RE 越界] string 下标 [${idx}] 超出长度 ${this.data.length}`);
    }
    return this.data[idx];
  }

  public push_back(ch: string): void {
    this.data += ch;
  }

  public clone(): HostString {
    return new HostString(this.data);
  }
}

export class HostPair {
  public first: any;
  public second: any;

  constructor(first: any = 0, second: any = 0) {
    this.first = first;
    this.second = second;
  }

  public clone(): HostPair {
    const f = this.first?.clone ? this.first.clone() : this.first;
    const s = this.second?.clone ? this.second.clone() : this.second;
    return new HostPair(f, s);
  }
}

export class HostQueue {
  public data: any[] = [];

  public push(val: any): void {
    this.data.push(val);
  }

  public pop(): void {
    if (this.data.length > 0) {
      this.data.shift();
    }
  }

  public front(): any {
    if (this.data.length === 0) {
      throw new Error('[RE 队列为空] 调用 queue.front() 时队列为空！');
    }
    return this.data[0];
  }

  public back(): any {
    if (this.data.length === 0) {
      throw new Error('[RE 队列为空] 调用 queue.back() 时队列为空！');
    }
    return this.data[this.data.length - 1];
  }

  public size(): number {
    return this.data.length;
  }

  public empty(): boolean {
    return this.data.length === 0;
  }

  public clone(): HostQueue {
    const q = new HostQueue();
    q.data = [...this.data];
    return q;
  }
}

export class HostStack {
  public data: any[] = [];

  public push(val: any): void {
    this.data.push(val);
  }

  public pop(): void {
    if (this.data.length > 0) {
      this.data.pop();
    }
  }

  public top(): any {
    if (this.data.length === 0) {
      throw new Error('[RE 栈为空] 调用 stack.top() 时栈为空！');
    }
    return this.data[this.data.length - 1];
  }

  public size(): number {
    return this.data.length;
  }

  public empty(): boolean {
    return this.data.length === 0;
  }

  public clone(): HostStack {
    const s = new HostStack();
    s.data = [...this.data];
    return s;
  }
}

export class HostPriorityQueue {
  public heap: any[] = [];

  public push(val: any): void {
    this.heap.push(val);
    this.up(this.heap.length - 1);
  }

  public pop(): void {
    if (this.heap.length === 0) return;
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.down(0);
    }
  }

  public top(): any {
    if (this.heap.length === 0) {
      throw new Error('[RE 堆为空] 调用 priority_queue.top() 时优先队列为空！');
    }
    return this.heap[0];
  }

  public size(): number {
    return this.heap.length;
  }

  public empty(): boolean {
    return this.heap.length === 0;
  }

  private compare(a: any, b: any): number {
    if (a instanceof HostPair && b instanceof HostPair) {
      if (a.first !== b.first) return a.first - b.first;
      return a.second - b.second;
    }
    return a - b;
  }

  private up(i: number): void {
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (this.compare(this.heap[i], this.heap[p]) > 0) {
        const tmp = this.heap[i];
        this.heap[i] = this.heap[p];
        this.heap[p] = tmp;
        i = p;
      } else {
        break;
      }
    }
  }

  private down(i: number): void {
    const n = this.heap.length;
    while (2 * i + 1 < n) {
      let largest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && this.compare(this.heap[l], this.heap[largest]) > 0) largest = l;
      if (r < n && this.compare(this.heap[r], this.heap[largest]) > 0) largest = r;
      if (largest !== i) {
        const tmp = this.heap[i];
        this.heap[i] = this.heap[largest];
        this.heap[largest] = tmp;
        i = largest;
      } else {
        break;
      }
    }
  }

  public clone(): HostPriorityQueue {
    const pq = new HostPriorityQueue();
    pq.heap = [...this.heap];
    return pq;
  }
}

/**
 * 宿主辅助算法函数集合
 */
export const HostAlgorithms = {
  max(a: number, b: number): number {
    return Math.max(a, b);
  },
  min(a: number, b: number): number {
    return Math.min(a, b);
  },
  abs(a: number): number {
    return Math.abs(a);
  },
  make_pair(a: any, b: any): HostPair {
    return new HostPair(a, b);
  },
  reverse(container: HostVector | any[]): void {
    if (container instanceof HostVector) {
      container.data.reverse();
    } else if (Array.isArray(container)) {
      container.reverse();
    }
  },
};

import { Document, Model, FilterQuery, UpdateQuery, QueryOptions } from 'mongoose';

export interface IBaseRepository<T extends Document> {
  create(item: any): Promise<T>;
  findById(id: string): Promise<T | null>;
  findOne(filter: FilterQuery<T>): Promise<T | null>;
  find(filter: FilterQuery<T>, options?: QueryOptions): Promise<T[]>;
  update(id: string, update: UpdateQuery<T>): Promise<T | null>;
  updateMany(filter: FilterQuery<T>, update: UpdateQuery<T>): Promise<any>;
  delete(id: string): Promise<T | null>;
  deleteMany(filter: FilterQuery<T>): Promise<any>;
  exists(filter: FilterQuery<T>): Promise<boolean>;
}

export class BaseRepository<T extends Document> implements IBaseRepository<T> {
  protected readonly model: Model<T>;

  constructor(model: Model<T>) {
    this.model = model;
  }

  public async create(item: any): Promise<T> {
    return this.model.create(item);
  }

  public async findById(id: string): Promise<T | null> {
    return this.model.findById(id).exec();
  }

  public async findOne(filter: FilterQuery<T>): Promise<T | null> {
    return this.model.findOne(filter).exec();
  }

  public async find(filter: FilterQuery<T>, options: QueryOptions = {}): Promise<T[]> {
    return this.model.find(filter, null, options).exec();
  }

  public async update(id: string, update: UpdateQuery<T>): Promise<T | null> {
    return this.model.findByIdAndUpdate(id, update, { new: true, runValidators: true }).exec();
  }

  public async updateMany(filter: FilterQuery<T>, update: UpdateQuery<T>): Promise<any> {
    return this.model.updateMany(filter, update).exec();
  }

  public async delete(id: string): Promise<T | null> {
    return this.model.findByIdAndDelete(id).exec();
  }

  public async deleteMany(filter: FilterQuery<T>): Promise<any> {
    return this.model.deleteMany(filter).exec();
  }

  public async exists(filter: FilterQuery<T>): Promise<boolean> {
    const result = await this.model.exists(filter);
    return result !== null;
  }
}

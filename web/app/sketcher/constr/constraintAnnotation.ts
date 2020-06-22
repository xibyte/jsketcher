export interface ConstraintAnnotation<T> {

  save(): T;

  load(data: T);
}
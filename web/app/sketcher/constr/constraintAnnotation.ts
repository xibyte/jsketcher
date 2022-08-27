export interface ConstraintAnnotation<T> {

  save(): T;

  load(data: T);

  isConstraintAnnotation: boolean;

}


export function isConstraintAnnotation(obj: any): obj is ConstraintAnnotation<any> {
  return obj&&obj.isConstraintAnnotation === true;
}
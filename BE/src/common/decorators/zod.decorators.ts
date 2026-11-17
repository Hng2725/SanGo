import { Body, Param, Query } from '@nestjs/common';
import type { ZodTypeAny } from 'zod';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';
export const ZodBody = (schema: ZodTypeAny): ParameterDecorator =>
  Body(new ZodValidationPipe(schema));
export const ZodQuery = (schema: ZodTypeAny): ParameterDecorator =>
  Query(new ZodValidationPipe(schema));
export const ZodParam = (name: string, schema: ZodTypeAny): ParameterDecorator =>
  Param(name, new ZodValidationPipe(schema));

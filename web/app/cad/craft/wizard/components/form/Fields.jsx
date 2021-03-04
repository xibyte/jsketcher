import React from 'react';
import {attachToForm, formField} from './Form';
import NumberControl from 'ui/components/controls/NumberControl';
import TextControl from 'ui/components/controls/TextControl';
import RadioButtons from 'ui/components/controls/RadioButtons';
import CheckboxControl from 'ui/components/controls/CheckboxControl';
import ReadOnlyValueControl from 'ui/components/controls/ReadOnlyValueControl';
import ComboBoxControl from 'ui/components/controls/ComboBoxControl';
import FileControl from 'ui/components/controls/FileControl';

export const NumberField = attachToForm(formField(NumberControl));
export const TextField = attachToForm(formField(TextControl));
export const RadioButtonsField = attachToForm(formField(RadioButtons));
export const CheckboxField = attachToForm(formField(CheckboxControl));
export const ComboBoxField = attachToForm(formField(ComboBoxControl));
export const ReadOnlyValueField = attachToForm(formField(ReadOnlyValueControl));
export const FileField = attachToForm(formField(FileControl));

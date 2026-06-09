-- 1. Añadir columna customer_id a trailer_canvas_settings referenciando a la tabla customers
ALTER TABLE tgm.trailer_canvas_settings 
ADD COLUMN customer_id UUID REFERENCES tgm.customers(id) ON DELETE CASCADE;

-- 2. Añadir columna customer_id a baqueton_profiles referenciando a la tabla customers
ALTER TABLE tgm.baqueton_profiles 
ADD COLUMN customer_id UUID REFERENCES tgm.customers(id) ON DELETE CASCADE;

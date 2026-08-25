# Propiedad intelectual

Verifica primero contra `references/mexico/sources.md`. Relevante cuando la aplicación
publica contenido, permite subir archivos, usa recursos de terceros (imágenes, fuentes,
íconos) o incorpora dependencias de código con licencias que importa respetar.

## Qué verificar

- **Contenido generado por usuarios (UGC).** Si el sistema permite subir texto, imágenes
  o archivos que luego se muestran a otros usuarios, ¿los Términos y Condiciones (si
  existen) aclaran quién es titular de ese contenido y bajo qué licencia lo usa la
  plataforma? Si no hay Términos, es un hallazgo de documento faltante, no
  necesariamente de infracción.
- **Recursos de terceros usados por la aplicación** (bancos de imágenes, fuentes,
  librerías de íconos, plantillas). Verifica si la licencia de cada uno permite el uso que
  el sistema le está dando (comercial, distribución, modificación) — esto normalmente se
  puede confirmar leyendo el archivo de licencia o los términos del proveedor, no requiere
  criterio jurídico salvo en casos límite.
- **Si la app entrega al usuario un recurso de un tercero** (p. ej. una foto de un banco
  de imágenes gratuito que el usuario descarga), verifica si la licencia de ese recurso se
  le comunica al usuario final — si no, es un hallazgo de bajo riesgo para la plataforma
  pero real para quien usa el recurso después.
- **Dependencias de software.** Licencias de paquetes/dependencias usadas en producción —
  generalmente basta con un escaneo de licencias declaradas (MIT, Apache, GPL, etc.); un
  hallazgo con licencia copyleft fuerte (GPL) en una dependencia embebida en código
  propietario distribuido amerita `LEGAL_REVIEW_REQUIRED`, no una conclusión automática.
- **Ley Federal del Derecho de Autor** — fuente primaria en LeyesBiblio de la Cámara de
  Diputados; verifica vigencia y artículos relevantes solo si el hallazgo concreto lo
  amerita, no como checklist genérico sin caso de uso real detrás.

## Expresamente fuera de alcance

- Búsqueda de marcas registradas.
- Análisis de conflictos marcarios con terceros.
- Determinar si el nombre de la aplicación o de la empresa infringe una marca de un
  tercero, o si el nombre está disponible legalmente para registrarse.

Si detectas algo que _parece_ un problema marcario (p. ej. el nombre del proyecto es
sospechosamente similar al de otra marca conocida), puedes mencionarlo como observación
puntual dirigida a Legal, pero no lo investigues ni lo analices — no es el trabajo de este
skill.

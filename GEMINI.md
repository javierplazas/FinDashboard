# Guía de Publicación y Versionado para FinDashboard

Cada vez que se suban cambios a GitHub (`git commit` y `git push`), es **obligatorio** seguir el siguiente protocolo de versionado y documentación:

1. **Incremento de Versión:**
   - Incrementar la versión en `package.json` y `package-lock.json` (`npm version patch` para correcciones/mejoras menores, o minor/major según la envergadura del cambio).
   - Verificar que la versión se refleje correctamente en la aplicación (a través de `__APP_VERSION__`).

2. **Documentación del Commit:**
   - Formato del título: `<tipo>: <descripción del cambio> (vX.Y.Z)`.
   - Cuerpo del commit detallado:
     - Lista clara y explicativa de los cambios y funcionalidades implementadas.
     - Ficheros y componentes modificados.
     - Versión en la que se liberan los cambios.

3. **Etiqueta de Versión en Git (Tag):**
   - Crear un git tag anotado para la versión liberada:
     ```bash
     git tag -a vX.Y.Z -m "Release vX.Y.Z: <resumen de cambios>"
     ```
   - Subir el tag a GitHub:
     ```bash
     git push origin vX.Y.Z
     ```

4. **Sincronización Previa:**
   - Hacer siempre `git fetch origin` y `git rebase origin/main` para incorporar commits remotos automáticos (como los de actualización automática de `movimientos.csv`) antes de hacer el push final.

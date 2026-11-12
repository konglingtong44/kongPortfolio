// Original discovery garden scene, generated without game references. See DESIGN_NOTES.md for the prompt.
export function PixelGarden({ compact = false }: { compact?: boolean }) {
  return <img className={`pixel-garden ${compact ? 'compact' : ''}`} src={`${import.meta.env.BASE_URL}images/discovery-garden.png`} alt="" aria-hidden="true" width={1536} height={1024} loading={compact ? 'lazy' : 'eager'} fetchPriority={compact ? 'auto' : 'high'}/>;
}
export function PixelMark({ variant = 0 }: { variant?: number }) {
  return <svg className="pixel-mark" viewBox="0 0 64 64" shapeRendering="crispEdges" aria-hidden="true">
    {variant % 4 === 0 ? <><path d="M9 16h46v33H9z" fill="#8C6A43"/><path d="M13 20h38v25H13z" fill="#FFF8EC"/><path d="M17 25h10v4H17z M17 33h23v3H17z M17 39h17v3H17z" fill="#6D8B74"/><path d="M28 49h8v5H28z M20 54h24v4H20z" fill="#3E3A36"/></> : variant % 4 === 1 ? <><path d="M12 18h40v34H12z" fill="#8C6A43"/><path d="M16 22h32v26H16z" fill="#FFF8EC"/><path d="M22 28h8v8h-8z M34 28h8v8h-8z M27 39h10v9H27z M9 14h46v8H9z" fill="#6D8B74"/><path d="M19 10h26v4H19z" fill="#6D8B74"/></> : variant % 4 === 2 ? <><path d="M12 27h40v27H12z" fill="#8C6A43"/><path d="M16 31h32v19H16z" fill="#FFF8EC"/><path d="M24 31h16v19H24z" fill="#A4B494"/><path d="M29 19h6v35h-6z M17 17v-7h10v5h5v8H22v-6z M47 17v-7H37v5h-5v8h10v-6z" fill="#6D8B74"/></> : <><path d="M18 13h28v5H18z M13 18h38v37H13z" fill="#8C6A43"/><path d="M18 22h28v28H18z" fill="#FFF8EC"/><path d="M24 29h16v4H24z M24 37h11v4H24z" fill="#6D8B74"/></>}
  </svg>;
}

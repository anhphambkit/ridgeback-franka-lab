import { useEffect, useRef } from "react";

const controlledKeys = new Set([
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
])

export function useKeyboardDrive() {
    const keys = useRef(new Set<string>())
    useEffect(() => {
        const onDown = (event: KeyboardEvent) => {
            if (controlledKeys.has(event.key)) event.preventDefault()
            keys.current.add(event.key)
        }

        const onUp = (event: KeyboardEvent) => keys.current.delete(event.key)

        const onBlur = () => keys.current.clear()

        window.addEventListener('keydown', onDown)
        window.addEventListener('keyup', onUp)
        window.addEventListener('blur', onBlur)

        return () => {
            window.removeEventListener('keydown', onDown)
            window.removeEventListener('keyup', onUp)
            window.removeEventListener('blur', onBlur)
        }
    }, [])
    return keys
}
import { writable } from 'svelte/store'

const someObject = {
    a: "a",
    b: {
        a: "a",
        b: {
            a: "a",
            b: "b"
        }
    }
}

export const storeObj = writable(someObject)

export const changeNestedMutation = () => {
    someObject.b.b.b = "c"
    storeObj.update(x => someObject)
    // works
}

export const mutateSurreptitiously = () => { 
    someObject.b.b.b = "d"
}

export const update = () => {
    storeObj.update(x => someObject)
}
const searchContainer = document.querySelector('.search-input-box');
const inputSearch = searchContainer.querySelector('input');
const boxSuggestions = document.querySelector('#suggestionsBox');

// Muestra todas las sugerencias al hacer clic en el input
inputSearch.addEventListener('click', () => {
    const allSuggestions = suggestions.map(data => `<li>${data}</li>`).join('');
    boxSuggestions.innerHTML = allSuggestions;
    searchContainer.classList.add('active'); // Agregar clase para mostrar
    attachClickListeners();
});

// Filtra las sugerencias al escribir
inputSearch.onkeyup = (e) => {
    let userData = e.target.value.toLowerCase();
    let filteredArray = [];

    if (userData) {
        filteredArray = suggestions.filter(data =>
            data.toLowerCase().startsWith(userData)
        );
        filteredArray = filteredArray.map(data => `<li>${data}</li>`);
        searchContainer.classList.add('active');
        showSuggestions(filteredArray);
    } else {
        searchContainer.classList.remove('active');
    }
};

function attachClickListeners() {
    const allListItems = boxSuggestions.querySelectorAll('li');
    allListItems.forEach(li => {
        li.setAttribute('onclick', 'select(this)');
    });
}

function select(element) {
    let selectUserData = element.textContent;
    inputSearch.value = selectUserData;
    searchContainer.classList.remove('active'); // Ocultar sugerencias
}

const showSuggestions = (list) => {
    if (!list.length) {
        boxSuggestions.innerHTML = '<li>No se encontraron resultados</li>';
    } else {
        boxSuggestions.innerHTML = list.join('');
        attachClickListeners();
    }
};

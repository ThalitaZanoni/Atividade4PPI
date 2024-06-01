import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const host = '0.0.0.0';
const porta = 3000;

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(process.cwd(), 'publico')));
app.use(express.static(path.join(process.cwd(), 'protegido')));
app.use(session({
  secret: 'MinH4Ch4v3S3cr3t4',
  resave: true,
  saveUninitialized: true,
  cookie: {
    maxAge: 1000 * 60 * 15
  }
}));

const loadProducts = () => {
  try {
    const data = readFileSync('products.json', 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
};

const saveProducts = (products) => {
  writeFileSync('products.json', JSON.stringify(products));
};

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'publico', 'login.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin') {
      res.cookie('username', username);
      res.cookie('last_access', new Date().toISOString());
      res.status(200).send();
  } else {
      res.status(401).send('Usuário ou senha inválidos');
  }
});


app.post('/cadastro', (req, res) => {
  const username = req.cookies.username;
  if (!username) {
    return res.status(403).send('Você precisa realizar o login');
  }

  const product = {
    codigo_barras: req.body.codigo_barras,
    descricao: req.body.descricao,
    preco_custo: req.body.preco_custo,
    preco_venda: req.body.preco_venda,
    data_validade: req.body.data_validade,
    quantidade_estoque: req.body.quantidade_estoque,
    nome_fabricante: req.body.nome_fabricante
  };

  const products = loadProducts();
  products.push(product);
  saveProducts(products);

  res.status(200).send();
});

app.get('/products', (req, res) => {
  const username = req.cookies.username;
  if (!username) {
    return res.status(403).send('Você precisa realizar o login');
  }
  const products = loadProducts();
  const last_access = req.cookies.last_access;
  res.json({ products, last_access });
});

app.get('/logout', (req, res) => {
  res.clearCookie('username');
  res.clearCookie('last_access');
  res.redirect('/');
});

app.get('/login.html', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Login</title>
        <link rel="stylesheet" type="text/css" href="style.css">
    </head>
    <body>
        <h2>Login</h2>
        <p id="errorMessage" style="color: red;"></p> <!-- Elemento para mensagens de erro -->
        <form id="loginForm">
            <label for="username">Usuário:</label>
            <input type="text" id="username" name="username" required>
            <br>
            <label for="password">Senha:</label>
            <input type="password" id="password" name="password" required>
            <br>
            <input type="submit" value="Login">
        </form>
        <script>
          document.getElementById('loginForm').addEventListener('submit', async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const data = Object.fromEntries(formData.entries());
              const response = await fetch('/login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data)
              });
              if (response.ok) {
                  window.location.href = '/cadastro.html';
              } else {
                  const errorMessage = await response.text();
                  document.getElementById('errorMessage').textContent = errorMessage;
              }
          });
        </script>
    </body>
    </html>
  `);
});

app.get('/cadastro.html', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Cadastro de Produto</title>
        <link rel="stylesheet" type="text/css" href="style.css">
    </head>
    <body>
        <h2>Cadastro de Produto</h2>
        <form id="cadastroForm">
            <label for="codigo_barras">Código de Barras:</label>
            <input type="text" id="codigo_barras" name="codigo_barras" required>
            <br>
            <label for="descricao">Descrição:</label>
            <input type="text" id="descricao" name="descricao" required>
            <br>
            <label for="preco_custo">Preço de Custo:</label>
            <input type="number" id="preco_custo" name="preco_custo" required>
            <br>
            <label for="preco_venda">Preço de Venda:</label>
            <input type="number" id="preco_venda" name="preco_venda" required>
            <br>
            <label for="data_validade">Data de Validade:</label>
            <input type="date" id="data_validade" name="data_validade" required>
            <br>
            <label for="quantidade_estoque">Quantidade em Estoque:</label>
            <input type="number" id="quantidade_estoque" name="quantidade_estoque" required>
            <br>
            <label for="nome_fabricante">Nome do Fabricante:</label>
            <input type="text" id="nome_fabricante" name="nome_fabricante" required>
            <br>
            <input type="submit" value="Cadastrar">
        </form>
        <br>
        <a href="tabela.html">Ver Produtos Cadastrados</a>
        <script>
          document.getElementById('cadastroForm').addEventListener('submit', async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const data = Object.fromEntries(formData.entries());
              const response = await fetch('/cadastro', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data)
              });
              if (response.ok) {
                  window.location.href = '/tabela.html';
              } else {
                  alert('Erro ao cadastrar produto');
              }
          });
        </script>
    </body>
    </html>
  `);
});

app.get('/tabela.html', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Produtos Cadastrados</title>
        <link rel="stylesheet" type="text/css" href="style.css">
    </head>
    <body>
        <h2>Produtos Cadastrados</h2>
        <p id="lastAccess"></p>
        <table id="productsTable">
            <tr>
                <th>Código de Barras</th>
                <th>Descrição</th>
                <th>Preço de Custo</th>
                <th>Preço de Venda</th>
                <th>Data de Validade</th>
                <th>Quantidade em Estoque</th>
                <th>Nome do Fabricante</th>
            </tr>
        </table>
        <br>
        <a href="cadastro.html">Cadastrar Novo Produto</a>
        <br>
        <a href="/logout">Logout</a>
        <script>
          document.addEventListener('DOMContentLoaded', () => {
              fetch('/products')
                  .then(response => response.json())
                  .then(data => {
                      const { products, last_access } = data;
                      const lastAccess = document.getElementById('lastAccess');
                      lastAccess.textContent = \`Último acesso: \${last_access}\`;
                      const productsTable = document.getElementById('productsTable');
                      products.forEach(product => {
                          const row = productsTable.insertRow();
                          Object.values(product).forEach(text => {
                              const cell = row.insertCell();
                              cell.textContent = text;
                          });
                      });
                  })
                  .catch(error => console.error('Erro ao carregar produtos:', error));
          });
        </script>
    </body>
    </html>
  `);
});

app.listen(porta, host, () => {
  console.log(`Servidor rodando em http://${host}:${porta}`);
});

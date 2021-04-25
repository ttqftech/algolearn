import React from 'react';
import logo from './logo.svg';
import './App.css';

class App extends React.Component {
	render () {
		return (
			<div className="App">
				<div className="header">
					<img src={logo} className="logo" alt="logo" />
					<h1 className="name">algolearn</h1>
				</div>
				<div>

				</div>
			</div>
		)
	}
}

// function App() {
// 	return (
// 		<div className="App">
// 			<header className="App-header">
// 				<p>
// 					Edit <code>src/App.tsx</code> and save to reload.
// 				</p>
// 				<a
// 					className="App-link"
// 					href="https://reactjs.org"
// 					target="_blank"
// 					rel="noopener noreferrer"
// 				>
// 					Learn React
// 				</a>
// 			</header>
// 		</div>
// 	);
// }

export default App;

import React from 'react';
import './App.scss';
import { createApiClient, Ticket } from './api';
import { Moon, Sun, PlusLg } from 'react-bootstrap-icons';
import { v4 as uuidv4 } from "uuid";
import {stat} from "fs";

export type AppState = {
	tickets?: Ticket[],
	search: string,
	mode: string, // dark or light mode
	openForm: boolean,
	payload: Ticket,
	errors: string,
	page: number,
}

const api = createApiClient();

export class App extends React.PureComponent<{}, AppState> {

	state: AppState = {
		search: '',
		mode: 'light',
		openForm: false,
		payload: {
			id: '',
			title: '',
			userEmail: '',
			content: '',
			creationTime: 0,
			labels: [],
			hide: false,
		},
		errors: '',
		page: 0,
	}

	searchDebounce: any = null;

	async componentDidMount() {
		const more = await api.getTickets(this.state.page);

		this.setState({
			tickets: this.state.tickets ? this.state.tickets.concat(more) : more,
			page: more.length === 20 ? this.state.page + 1 : -1,
		});
	}

	renderTickets = (tickets: Ticket[]) => {

		const filteredTickets = tickets
			.filter((t) => (t.title.toLowerCase() + t.content.toLowerCase()).includes(this.state.search.toLowerCase()));

		const HandleClick = (ticket: Ticket) => {
			const newTickets = filteredTickets.map(element => {
				if(element.id === ticket.id) {
					element.hide = !element.hide
				}
				return element;
			});

			this.setState({
				tickets: newTickets,
			})
		}

		const { mode } = this.state;

		return (
		<div className={ mode }>
			<ul className='tickets'>
				{ filteredTickets.map((ticket) => (
				<li key={ ticket.id } className='ticket'>
					<div className='flex'>
						<h5 className='title'>{ ticket.title }</h5>
						<button onClick={ () => HandleClick(ticket) } className='hideTicket overlay-button'>
							{
								!ticket.hide ? 'hide' : 'restore'
							}
						</button>
					</div>
					{
						!ticket.hide ?
							<p className='content'>
								{ ticket.content }
							</p>
							: null
					}
					<footer>
						<div className='meta-data'>By { ticket.userEmail } | { new Date(ticket.creationTime).toLocaleString()}</div>
					</footer>
				</li>))}
			</ul>
		</div>
		);
	}

	onSearch = async (val: string, newPage?: number) => {
		
		clearTimeout(this.searchDebounce);

		this.searchDebounce = setTimeout(async () => {
			this.setState({
				search: val
			});
		}, 300);
	}

	mode = () => {
		this.setState({
			mode: this.state.mode === 'light' ? 'dark' : 'light',
		})
	}

	newTicket = async () => {
		if(this.state.openForm && !window.confirm('Are you sure?')) {
			return;
		}

		this.setState({
			openForm: !this.state.openForm,
			errors: '',
		})
	}

	emailValidation = () =>{
		const regex = /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
		if(!this.state.payload.userEmail || regex.test(this.state.payload.userEmail) === false){
			this.setState({
				errors: "Email is not valid.",
			});
			return false;
		}
		return true;
	}

	handleSubmit = async () => {
		const { payload, tickets } = this.state;

		if(payload.title === '' || payload.content === '') {
			this.setState({
				errors: 'All fields are required',
			})

			return;
		}

		if(!this.emailValidation()){
			return;
		}

		const id = uuidv4();

		payload.id = id;
		payload.creationTime = new Date().getTime();
		payload.hide = false;

		try {
			await api.clone(this.state.payload);

			const newTicket = [payload];
			if(tickets)
				newTicket.push(...tickets );

			this.setState({
				tickets: newTicket,
				payload: {
					id: '',
					title: '',
					userEmail: '',
					content: '',
					creationTime: 0,
					labels: [],
					hide: false,
				},
				openForm: false,
			});
		} catch (error) {
			console.log(error);
		}
	}

	handleChange = (key: string, value: string) => {
		const payload = this.state.payload;
		switch (key) {
			case 'title':
				payload.title = value;
				break;
			case 'content':
				payload.content = value;
				break;
			case 'userEmail':
				payload.userEmail = value;
				break;
			case 'labels':
				payload.labels = value.split(',').filter(item => item.length > 0);
				break;
		}

		this.setState({
			payload,
			errors: '',
		})
	}

	form = () => {
		const { mode, errors } = this.state;

		return (
			<div className={ mode }>
				<div className='form-card'>
					<div className="row">
						<label htmlFor="title">Title</label>
						<input type="text" placeholder="title" onKeyPress={ this.handleSubmit } onChange={event => this.handleChange('title', event.target.value)} />
					</div>

					<div className="row-label">
						<p>
							Separate with a comma (,) between the labels
						</p>
						<div>
							<label htmlFor="labels">Labels</label>
							<input type="text" placeholder="labels" onKeyPress={ this.handleSubmit } onChange={event => this.handleChange('labels', event.target.value)} />
						</div>
					</div>


					<div className="row">
						<label htmlFor="content">Content</label>
						<textarea placeholder="content" onChange={event => this.handleChange('content', event.target.value)} />
					</div>

					<div className="row">
						<label htmlFor="email">Email</label>
						<input type="email" placeholder="email" onKeyPress={ this.handleSubmit } onChange={event => this.handleChange('userEmail', event.target.value)} />
					</div>

					{ errors !== '' ?
						<div className='errors'>
							{ errors }
						</div>
						: null
					}

					<div className="submit">
						<button onClick={ this.handleSubmit }>
							Send
						</button>
					</div>
				</div>
			</div>
		)
	}

	moreTickets = async () => {
		await this.componentDidMount();
	}

	render() {	
		const { tickets, mode, openForm, page } = this.state;

		return (
		<main data-testid="main" className={ 'main-' + mode }>
			<div className={ mode }>
				<button data-testid="dark-mode" onClick={ this.mode } className='dark_mode--button'>
					{ mode === 'light' ? 'Dark' : 'Light'} mode
				</button>
				<div>
					<h1>Tickets List</h1>
				</div>
				<header>
					<input type="search" placeholder="Search..." onChange={(e) => this.onSearch(e.target.value)}/>
				</header>
				{ tickets ?
					<div className='flex'>
						<div className='results'>Showing { tickets.length } results</div>
						<button onClick={ this.newTicket } className='add-ticket'>
							<PlusLg className='icon-button' />
							{ openForm ? 'Cancel' : 'Add Ticket' }
						</button>
					</div>
					:
					null
				}

				{ openForm ?
					this.form()
					: null
				}

				{ tickets ?
					this.renderTickets(tickets)
					: <h2 data-testid="not-ticket">Loading..</h2>
				}

				{ page !== -1 ?
					<div className="more-button-padding">
						<button data-testid='more' onClick={ this.moreTickets } className='more-button'>
							More Tickets
						</button>
					</div>
						: <div data-testid='no-more' className='results'>
							no more results
						</div>
				}
			</div>
		</main>)
	}
}

export default App;